// Translates API-Football's English league names into Brazilian Portuguese.
// Unknown leagues pass through untouched so other competitions still render
// with whatever name the API returns.

const LEAGUE_BY_KEY: Record<string, string> = {
  "world cup": "Copa do Mundo",
};

export function translateLeague(league: string | null | undefined): string {
  if (!league) return "";
  const key = league.trim().toLowerCase();
  if (!key) return "";
  return LEAGUE_BY_KEY[key] ?? league;
}
