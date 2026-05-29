export type MatchProviderKind = "espn" | "sports-api-pro";

export type MatchSource =
  | {
      kind: "team";
      // Which fetch backend to use for this calendar.
      provider: MatchProviderKind;
      // API-Football team ID — kept populated so reverting to API-Football
      // is a one-line provider swap, not a config-and-secrets dance.
      teamId: number;
      // ESPN team ID — used when provider === 'espn'.
      espnTeamId: number;
      // SportsAPI Pro team ID — used when provider === 'sports-api-pro'.
      sportsApiProTeamId?: number;
    }
  | {
      kind: "league";
      provider: MatchProviderKind;
      // API-Football league ID + season — kept populated, see note above.
      leagueId: number;
      season: number;
      // ESPN scoreboard path (e.g. "fifa.world") and date range
      // ("YYYYMMDD-YYYYMMDD") — used by the active provider.
      espnPath: string;
      espnDates: string;
    };

export interface CalendarEnvNames {
  calendarId: string;
  keysJson: string;
  serviceAccount?: string;
}

export interface CalendarConfig {
  key: string;
  env: CalendarEnvNames;
  source: MatchSource;
}

export interface ServiceAccountKeys {
  client_email: string;
  private_key: string;
  [extra: string]: unknown;
}

export interface ResolvedCalendar {
  key: string;
  source: MatchSource;
  calendarId: string;
  keys: ServiceAccountKeys;
  serviceAccount?: string;
}

// Order matters: each entry is updated sequentially. Keep the most reliable
// providers first so a flaky one (currently SportsAPI Pro returns occasional
// 502/503 on Ceará) can't starve the others if it stalls.
export const CALENDARS: CalendarConfig[] = [
  {
    key: "world-cup-2026",
    env: {
      calendarId: "WORLD_CUP_2026_CALENDAR_ID",
      keysJson: "WORLD_CUP_2026_GOOGLE_KEYS_JSON",
      serviceAccount: "WORLD_CUP_2026_GOOGLE_SERVICE_ACCOUNT",
    },
    source: {
      kind: "league",
      provider: "espn",
      leagueId: 1,
      season: 2026,
      espnPath: "fifa.world",
      espnDates: "20260611-20260719",
    },
  },
  {
    key: "ceara",
    env: {
      calendarId: "CEARA_CALENDAR_ID",
      keysJson: "CEARA_GOOGLE_KEYS_JSON",
      serviceAccount: "CEARA_GOOGLE_SERVICE_ACCOUNT",
    },
    source: {
      kind: "team",
      provider: "sports-api-pro",
      teamId: 129,
      espnTeamId: 9969,
      sportsApiProTeamId: 2001,
    },
  },
];

export function findCalendar(key: string): CalendarConfig | undefined {
  return CALENDARS.find((c) => c.key === key);
}

export function resolveCalendar(config: CalendarConfig): ResolvedCalendar {
  const calendarId = readRequired(config.env.calendarId, config.key);
  const rawKeys = readRequired(config.env.keysJson, config.key);

  let keys: ServiceAccountKeys;
  try {
    keys = JSON.parse(rawKeys);
  } catch (e) {
    throw new Error(
      `${config.env.keysJson} is not valid JSON: ${(e as Error).message}`
    );
  }
  if (!keys.client_email || !keys.private_key) {
    throw new Error(
      `${config.env.keysJson} is missing required field "client_email" or "private_key"`
    );
  }

  const serviceAccount = config.env.serviceAccount
    ? process.env[config.env.serviceAccount] || undefined
    : undefined;

  return {
    key: config.key,
    source: config.source,
    calendarId,
    keys,
    serviceAccount,
  };
}

function readRequired(envVar: string, calendarKey: string): string {
  const value = process.env[envVar];
  if (!value) {
    throw new Error(
      `${envVar} env var is required for calendar "${calendarKey}"`
    );
  }
  return value;
}
