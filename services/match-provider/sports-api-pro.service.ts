import MatchEnum from "./match.enum";
import { FixturesQuery, IMatchProvider } from "./match-provider.interface";
import { IMatch } from "./match.interface";

const SPORTS_API_PRO_BASE = "https://v2.football.sportsapipro.com";

// V2 status codes from the SportsAPI Pro docs (Sofascore-style).
const STATUS_BY_CODE: Record<number, MatchEnum.Status> = {
  0: MatchEnum.Status.NOT_STARTED,
  6: MatchEnum.Status.FIRST_HALF,
  7: MatchEnum.Status.SECOND_HALF,
  31: MatchEnum.Status.HALFTIME,
  40: MatchEnum.Status.EXTRA_TIME,
  41: MatchEnum.Status.EXTRA_TIME,
  50: MatchEnum.Status.PENALTY_IN_PROGRESS,
  60: MatchEnum.Status.POSTPONED,
  70: MatchEnum.Status.CANCELLED,
  80: MatchEnum.Status.INTERRUPTED,
  90: MatchEnum.Status.ABANDONED,
  100: MatchEnum.Status.FINISHED,
  110: MatchEnum.Status.FINISHED_AFTER_EXTRA_TIME,
  120: MatchEnum.Status.FINISHED_AFTER_PENALTY,
};

interface SportsApiTeam {
  id?: number;
  name?: string;
  shortName?: string;
  nameCode?: string;
  slug?: string;
  country?: { name?: string; alpha2?: string };
}

interface SportsApiScore {
  current?: number;
  display?: number;
  normaltime?: number;
  period1?: number;
  period2?: number;
  penalties?: number;
  aggregated?: number;
}

interface SportsApiStatus {
  code?: number;
  description?: string;
  type?: string;
}

interface SportsApiVenue {
  stadium?: { name?: string; capacity?: number };
  city?: { name?: string };
  country?: { name?: string; alpha2?: string };
}

interface SportsApiTournament {
  name?: string;
  slug?: string;
  uniqueTournament?: { name?: string; id?: number };
  category?: { name?: string; country?: { name?: string } };
}

interface SportsApiEvent {
  id?: number;
  customId?: string;
  startTimestamp?: number;
  status?: SportsApiStatus;
  tournament?: SportsApiTournament;
  roundInfo?: { round?: number; name?: string };
  homeTeam?: SportsApiTeam;
  awayTeam?: SportsApiTeam;
  homeScore?: SportsApiScore;
  awayScore?: SportsApiScore;
  venue?: SportsApiVenue;
}

interface SportsApiEnvelope {
  // Different endpoints return different shapes. Cover all the ones we hit.
  events?: SportsApiEvent[];
  previousEvent?: SportsApiEvent;
  nextEvent?: SportsApiEvent;
  hasNextPage?: boolean;
  data?: SportsApiEnvelope;
}

export class SportsApiProService implements IMatchProvider {
  constructor(private readonly teamId: number) {}

  async getFixtures(query: FixturesQuery): Promise<IMatch[]> {
    const apiKey = process.env["SPORTS_API_PRO_KEY"];
    if (!apiKey) {
      throw new Error("SPORTS_API_PRO_KEY env var is required");
    }

    const teamId = this.teamId;
    const byId = new Map<number, IMatch>();

    const near = await this.fetchJson(
      `${SPORTS_API_PRO_BASE}/api/teams/${teamId}/near-events`,
      apiKey
    );
    for (const event of collectEvents(near)) {
      const match = mapEvent(event);
      if (match) byId.set(match.fixture.id, match);
    }

    const next = await this.fetchJson(
      `${SPORTS_API_PRO_BASE}/api/teams/${teamId}/events/next/0`,
      apiKey
    );
    for (const event of collectEvents(next)) {
      const match = mapEvent(event);
      if (match) byId.set(match.fixture.id, match);
    }

    return Array.from(byId.values()).filter((m) => withinWindow(m, query));
  }

  private async fetchJson(
    url: string,
    apiKey: string
  ): Promise<SportsApiEnvelope> {
    const attempts = RETRY_DELAYS_MS.length + 1;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      console.log(`[sports-api-pro] GET ${url}${attempt > 1 ? ` (retry ${attempt - 1})` : ""}`);
      let response: Response;
      try {
        response = await fetch(url, { headers: { "x-api-key": apiKey } });
      } catch (err) {
        // Network-level failure (DNS, reset, etc) — treat as retryable.
        lastError = err as Error;
        if (attempt < attempts) {
          await sleep(RETRY_DELAYS_MS[attempt - 1]);
          continue;
        }
        throw lastError;
      }

      if (response.ok) {
        const body = (await response.json()) as SportsApiEnvelope;
        const events = collectEvents(body);
        console.log(`[sports-api-pro] ${response.status} results=${events.length}`);
        return body;
      }

      const text = await response.text().catch(() => "<unreadable body>");
      const error = new Error(
        `SportsAPI Pro request failed: ${response.status} ${response.statusText} — ${text}`
      );
      if (TRANSIENT_STATUSES.has(response.status) && attempt < attempts) {
        console.log(
          `[sports-api-pro] ${response.status} transient — retrying in ${RETRY_DELAYS_MS[attempt - 1]}ms`
        );
        lastError = error;
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
        continue;
      }
      throw error;
    }

    throw lastError ?? new Error("SportsAPI Pro request failed after retries");
  }
}

const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
const RETRY_DELAYS_MS = [500, 1500, 4000];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectEvents(body: SportsApiEnvelope): SportsApiEvent[] {
  const root = body?.data ?? body ?? {};
  const events: SportsApiEvent[] = [];
  if (Array.isArray(root.events)) events.push(...root.events);
  if (root.previousEvent) events.push(root.previousEvent);
  if (root.nextEvent) events.push(root.nextEvent);
  return events;
}

function mapEvent(event: SportsApiEvent): IMatch | null {
  if (!event?.id || !event.homeTeam || !event.awayTeam) return null;
  if (!event.startTimestamp) return null;

  const statusCode = event.status?.code;
  const statusShort =
    (statusCode !== undefined && STATUS_BY_CODE[statusCode]) ||
    MatchEnum.Status.NOT_STARTED;

  return {
    fixture: {
      id: event.id,
      referee: "",
      date: new Date(event.startTimestamp * 1000).toISOString(),
      timezone: "UTC",
      timestamp: event.startTimestamp,
      venue: {
        id: 0,
        name: event.venue?.stadium?.name ?? "",
        city: event.venue?.city?.name ?? "",
      },
      status: {
        long: event.status?.description ?? event.status?.type ?? "",
        short: statusShort,
        elapsed: 0,
      },
    },
    league: {
      id: event.tournament?.uniqueTournament?.id ?? 0,
      name:
        event.tournament?.uniqueTournament?.name ??
        event.tournament?.name ??
        "",
      country: event.tournament?.category?.country?.name ?? "",
      season: "",
      round:
        event.roundInfo?.round !== undefined
          ? String(event.roundInfo.round)
          : event.roundInfo?.name ?? "",
    },
    teams: {
      home: mapTeam(event.homeTeam),
      away: mapTeam(event.awayTeam),
    },
    goals: {
      home: pickScore(event.homeScore),
      away: pickScore(event.awayScore),
    },
    score: {
      penalty: {
        home: event.homeScore?.penalties ?? 0,
        away: event.awayScore?.penalties ?? 0,
      },
    },
  };
}

function mapTeam(team: SportsApiTeam) {
  return {
    id: team.id ?? 0,
    name: team.name ?? team.shortName ?? "",
    code: team.nameCode || team.country?.alpha2 || undefined,
    winner: false,
  };
}

function pickScore(score: SportsApiScore | undefined): number {
  if (!score) return 0;
  // Prefer regulation time when extra time / penalties happened, since the
  // calendar event records the on-field result excluding shootouts.
  if (typeof score.normaltime === "number") return score.normaltime;
  if (typeof score.current === "number") return score.current;
  if (typeof score.display === "number") return score.display;
  return 0;
}

function withinWindow(match: IMatch, query: FixturesQuery): boolean {
  const t = match.fixture.timestamp * 1000;
  if (query.from && t < query.from.getTime()) return false;
  if (query.to && t > query.to.getTime()) return false;
  return true;
}
