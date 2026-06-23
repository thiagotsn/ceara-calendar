import { round32GameNumber } from "../../shared/world-cup-2026-bracket";
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
      .map((event) => mapEspnEventToMatch(event, undefined, undefined))
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
    const events = body.events ?? [];
    const gameIndex = buildGameIndex(events);
    return events
      .map((event) => mapEspnEventToMatch(event, fallbackLeagueName, gameIndex))
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
  fallbackLeagueName: string | undefined,
  gameIndex: GameIndex | undefined
): IMatch | null {
  const id = parseInt(event.id ?? "", 10);
  if (!Number.isFinite(id)) return null;

  const competition = event.competitions?.[0];
  if (!competition) return null;

  const { home, away } = splitHomeAway(competition.competitors ?? []);
  if (!home || !away) return null;

  const statusName = competition.status?.type?.name;
  const statusShort = STATUS_BY_NAME[statusName ?? ""] ?? MatchEnum.Status.NOT_STARTED;

  const homeTeam = competitorToTeam(home);
  const awayTeam = competitorToTeam(away);
  let gameNumber: number | undefined;
  if (gameIndex) {
    const homeFeeders = resolveFeeders(home, gameIndex);
    if (homeFeeders) homeTeam.feeders = homeFeeders;
    const awayFeeders = resolveFeeders(away, gameIndex);
    if (awayFeeders) awayTeam.feeders = awayFeeders;
    gameNumber = gameNumberOf(event, gameIndex) ?? undefined;
  }

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
      gameNumber,
    },
    teams: {
      home: homeTeam,
      away: awayTeam,
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

function competitorToTeam(competitor: EspnCompetitor): IMatch["teams"]["home"] {
  const team = competitor.team ?? {};
  return {
    id: parseInt(team.id ?? "", 10) || 0,
    name: team.displayName ?? "",
    code: team.abbreviation ?? undefined,
    winner: false,
  };
}

// --- Knockout bracket resolution -------------------------------------------
//
// ESPN encodes the bracket in competitor display names: a knockout slot is a
// placeholder like "Semifinal 1 Winner" that points to game N of an earlier
// round. Within a round, game N == the event's rank when that round's events
// are sorted by numeric id. We index that mapping, then for an undecided slot
// surface the two participants of its directly-feeding game (one level only).

// Per round slug: game number → event. For most rounds the game number equals
// the event's rank by id; the Round of 32 is numbered by FIFA match order
// instead (see shared/world-cup-2026-bracket).
type GameIndex = Map<string, Map<number, EspnEvent>>;

// "Round of 32 1 Winner" / "Quarterfinal 2 Winner" / "Semifinal 1 Loser" → the
// season slug + game number of the feeding game.
const PLACEHOLDER_ROUND_BY_LABEL: Record<string, string> = {
  "Round of 32": "round-of-32",
  "Round of 16": "round-of-16",
  Quarterfinal: "quarterfinals",
  Semifinal: "semifinals",
};

function buildGameIndex(events: EspnEvent[]): GameIndex {
  const bySlug = new Map<string, EspnEvent[]>();
  for (const event of events) {
    const slug = event.season?.slug;
    if (!slug) continue;
    const list = bySlug.get(slug) ?? [];
    list.push(event);
    bySlug.set(slug, list);
  }

  const index: GameIndex = new Map();
  for (const [slug, list] of bySlug) {
    const numbered = new Map<number, EspnEvent>();
    if (slug === "round-of-32") {
      for (const event of list) {
        const n = round32GameNumber(parseInt(event.id ?? "", 10));
        if (n != null) numbered.set(n, event);
      }
    } else {
      list
        .sort((a, b) => parseInt(a.id ?? "", 10) - parseInt(b.id ?? "", 10))
        .forEach((event, i) => numbered.set(i + 1, event));
    }
    index.set(slug, numbered);
  }
  return index;
}

// Rounds whose games are referenced by number in feeder placeholders, so a
// "Jogo N" label is meaningful for cross-referencing.
const NUMBERED_ROUNDS = new Set([
  "round-of-32",
  "round-of-16",
  "quarterfinals",
  "semifinals",
]);

// This event's own game number within its round (the reverse of the index).
function gameNumberOf(
  event: EspnEvent,
  gameIndex: GameIndex
): number | null {
  const slug = event.season?.slug;
  if (!slug || !NUMBERED_ROUNDS.has(slug)) return null;
  const round = gameIndex.get(slug);
  if (!round) return null;
  for (const [n, e] of round) {
    if (e.id === event.id) return n;
  }
  return null;
}

function parseGamePlaceholder(
  name: string | undefined
): { slug: string; n: number } | null {
  if (!name) return null;
  const m = name
    .trim()
    .match(/^(Round of 32|Round of 16|Quarterfinal|Semifinal) (\d+) (?:Winner|Loser)$/);
  if (!m) return null;
  const slug = PLACEHOLDER_ROUND_BY_LABEL[m[1]];
  if (!slug) return null;
  return { slug, n: parseInt(m[2], 10) };
}

function isGroupPlaceholder(name: string | undefined): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  return /^Group /.test(trimmed) || /^Third Place Group /.test(trimmed);
}

// A competitor is "decided" when it's a real team — not a game-winner
// placeholder and not a group placeholder.
function isDecided(competitor: EspnCompetitor): boolean {
  const name = competitor.team?.displayName;
  if (!name) return false;
  return !parseGamePlaceholder(name) && !isGroupPlaceholder(name);
}

function competitorToFeeder(
  competitor: EspnCompetitor
): { name: string; code?: string; decided: boolean } {
  const team = competitor.team ?? {};
  return {
    name: team.displayName ?? "",
    code: team.abbreviation ?? undefined,
    decided: isDecided(competitor),
  };
}

// For an undecided knockout slot, return the two participants of its directly-
// feeding game — but only when at least one is decided. Returns null (slot keeps
// its own placeholder text) when the feeding game is missing or fully undecided.
function resolveFeeders(
  competitor: EspnCompetitor,
  gameIndex: GameIndex
): Array<{ name: string; code?: string; decided: boolean }> | null {
  const ref = parseGamePlaceholder(competitor.team?.displayName);
  if (!ref) return null;
  const game = gameIndex.get(ref.slug)?.get(ref.n);
  if (!game) return null;
  const competitors = game.competitions?.[0]?.competitors ?? [];
  const { home, away } = splitHomeAway(competitors);
  if (!home || !away) return null;
  const feeders = [competitorToFeeder(home), competitorToFeeder(away)];
  if (!feeders.some((f) => f.decided)) return null;
  return feeders;
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
