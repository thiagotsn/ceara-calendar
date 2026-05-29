import MatchEnum from "./match.enum";
import { FixturesQuery, IMatchProvider } from "./match-provider.interface";
import { IMatch } from "./match.interface";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

// `STATUS_SCHEDULED`, `STATUS_FULL_TIME`, and `STATUS_FINAL_PEN` are the only
// statuses observed in the sample responses; the rest are defensive entries
// for ESPN's documented enum so unexpected statuses don't silently degrade.
const STATUS_BY_NAME: Record<string, MatchEnum.Status> = {
  STATUS_SCHEDULED: MatchEnum.Status.NOT_STARTED,
  STATUS_FULL_TIME: MatchEnum.Status.FINISHED,
  STATUS_FINAL_PEN: MatchEnum.Status.FINISHED_AFTER_PENALTY,
  STATUS_POSTPONED: MatchEnum.Status.POSTPONED,
  STATUS_CANCELED: MatchEnum.Status.CANCELLED,
  STATUS_CANCELLED: MatchEnum.Status.CANCELLED,
  STATUS_SUSPENDED: MatchEnum.Status.SUSPENDED,
  STATUS_IN_PROGRESS: MatchEnum.Status.FIRST_HALF,
  STATUS_FIRST_HALF: MatchEnum.Status.FIRST_HALF,
  STATUS_HALFTIME: MatchEnum.Status.HALFTIME,
  STATUS_SECOND_HALF: MatchEnum.Status.SECOND_HALF,
  STATUS_END_OF_REGULATION: MatchEnum.Status.EXTRA_TIME,
  STATUS_END_OF_EXTRATIME: MatchEnum.Status.EXTRA_TIME,
};

interface EspnTeam {
  id?: string;
  displayName?: string;
  abbreviation?: string;
}

interface EspnCompetitor {
  homeAway?: "home" | "away";
  team?: EspnTeam;
  score?: string | { value?: number; displayValue?: string } | null;
  shootoutScore?: number;
}

interface EspnStatus {
  type?: { name?: string };
}

interface EspnVenue {
  fullName?: string;
}

interface EspnCompetition {
  status?: EspnStatus;
  venue?: EspnVenue;
  competitors?: EspnCompetitor[];
}

interface EspnEvent {
  id?: string;
  date?: string;
  season?: { slug?: string };
  league?: { name?: string };
  competitions?: EspnCompetition[];
}

interface EspnResponse {
  events?: EspnEvent[];
  leagues?: Array<{ name?: string }>;
}

export type EspnConfig =
  | { kind: "team"; teamId: number }
  | { kind: "league"; path: string; dates: string };

export class EspnService implements IMatchProvider {
  constructor(private readonly config: EspnConfig) {}

  async getFixtures(query: FixturesQuery): Promise<IMatch[]> {
    if (this.config.kind === "team") {
      return this.fetchTeamMatches(this.config.teamId, query.from, query.to);
    }
    return this.fetchLeagueMatches(this.config.path, this.config.dates);
  }

  private async fetchTeamMatches(
    teamId: number,
    from?: Date,
    to?: Date
  ): Promise<IMatch[]> {
    const past = await this.fetchJson(
      `${ESPN_BASE}/all/teams/${teamId}/schedule`
    );
    const future = await this.fetchJson(
      `${ESPN_BASE}/all/teams/${teamId}/schedule?fixture=true`
    );

    const events = [...(past.events ?? []), ...(future.events ?? [])];
    const filtered = events.filter((event) => withinWindow(event.date, from, to));
    const matches = filtered
      .map((event) => mapEspnEventToMatch(event, undefined))
      .filter((m): m is IMatch => m !== null);

    // De-dupe by fixture ID — the two endpoints have disjoint sets in
    // practice, but be defensive against overlaps if ESPN ever changes that.
    const byId = new Map<number, IMatch>();
    for (const m of matches) byId.set(m.fixture.id, m);
    return Array.from(byId.values());
  }

  private async fetchLeagueMatches(
    espnPath: string,
    espnDates: string
  ): Promise<IMatch[]> {
    const url = `${ESPN_BASE}/${espnPath}/scoreboard?dates=${espnDates}&limit=200`;
    const body = await this.fetchJson(url);
    const fallbackLeagueName = body.leagues?.[0]?.name;
    return (body.events ?? [])
      .map((event) => mapEspnEventToMatch(event, fallbackLeagueName))
      .filter((m): m is IMatch => m !== null);
  }

  private async fetchJson(url: string): Promise<EspnResponse> {
    console.log(`[espn] GET ${url}`);
    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text().catch(() => "<unreadable body>");
      throw new Error(
        `ESPN request failed: ${response.status} ${response.statusText} — ${text}`
      );
    }
    const body = (await response.json()) as EspnResponse;
    console.log(
      `[espn] ${response.status} results=${(body.events ?? []).length}`
    );
    return body;
  }
}

function mapEspnEventToMatch(
  event: EspnEvent,
  fallbackLeagueName: string | undefined
): IMatch | null {
  const id = parseInt(event.id ?? "", 10);
  if (!Number.isFinite(id)) return null;

  const competition = event.competitions?.[0];
  if (!competition) return null;

  const { home, away } = splitHomeAway(competition.competitors ?? []);
  if (!home || !away) return null;

  const statusName = competition.status?.type?.name;
  const statusShort = STATUS_BY_NAME[statusName ?? ""] ?? MatchEnum.Status.NOT_STARTED;

  return {
    fixture: {
      id,
      referee: "",
      date: event.date ?? "",
      timezone: "UTC",
      timestamp: event.date ? Math.floor(new Date(event.date).getTime() / 1000) : 0,
      venue: {
        id: 0,
        name: competition.venue?.fullName ?? "",
        city: "",
      },
      status: { long: statusName ?? "", short: statusShort, elapsed: 0 },
    },
    league: {
      id: 0,
      name: event.league?.name ?? fallbackLeagueName ?? "",
      country: "",
      season: "",
      round: event.season?.slug ?? "",
    },
    teams: {
      home: competitorToTeam(home),
      away: competitorToTeam(away),
    },
    goals: {
      home: parseScore(home.score),
      away: parseScore(away.score),
    },
    score: {
      penalty: {
        home: home.shootoutScore ?? 0,
        away: away.shootoutScore ?? 0,
      },
    },
  };
}

function splitHomeAway(competitors: EspnCompetitor[]): {
  home?: EspnCompetitor;
  away?: EspnCompetitor;
} {
  return {
    home: competitors.find((c) => c.homeAway === "home"),
    away: competitors.find((c) => c.homeAway === "away"),
  };
}

function competitorToTeam(competitor: EspnCompetitor) {
  const team = competitor.team ?? {};
  return {
    id: parseInt(team.id ?? "", 10) || 0,
    name: team.displayName ?? "",
    code: team.abbreviation ?? undefined,
    winner: false,
  };
}

function parseScore(
  score: EspnCompetitor["score"]
): number {
  if (score == null) return 0;
  if (typeof score === "string") {
    const n = parseInt(score, 10);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof score.value === "number" && Number.isFinite(score.value)) {
    return Math.round(score.value);
  }
  if (score.displayValue) {
    const n = parseInt(score.displayValue, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function withinWindow(
  date: string | undefined,
  from: Date | undefined,
  to: Date | undefined
): boolean {
  if (!date) return false;
  const t = new Date(date).getTime();
  if (!Number.isFinite(t)) return false;
  if (from && t < from.getTime()) return false;
  if (to && t > to.getTime()) return false;
  return true;
}
