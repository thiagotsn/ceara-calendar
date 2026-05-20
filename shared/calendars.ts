export type MatchSource =
  | { kind: "team"; teamId: number }
  | { kind: "league"; leagueId: number; season: number };

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

export const CALENDARS: CalendarConfig[] = [
  {
    key: "ceara",
    env: {
      calendarId: "CEARA_CALENDAR_ID",
      keysJson: "CEARA_GOOGLE_KEYS_JSON",
      serviceAccount: "CEARA_GOOGLE_SERVICE_ACCOUNT",
    },
    source: { kind: "team", teamId: 129 },
  },
  {
    key: "world-cup-2026",
    env: {
      calendarId: "WORLD_CUP_2026_CALENDAR_ID",
      keysJson: "WORLD_CUP_2026_GOOGLE_KEYS_JSON",
      serviceAccount: "WORLD_CUP_2026_GOOGLE_SERVICE_ACCOUNT",
    },
    source: { kind: "league", leagueId: 1, season: 2026 },
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
