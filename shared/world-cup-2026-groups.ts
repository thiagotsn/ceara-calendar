// TEMPORARY — hardcoded team → group map for FIFA World Cup 2026.
//
// The /fixtures endpoint does not return the group letter, so until we wire up
// a /standings call (or the tournament ends, whichever comes first), this file
// is the single source of truth.
//
// Keys are API-Football team IDs (visible in /fixtures?league=1&season=2026
// → response[].teams.{home,away}.id). Values are the group letter A–L assigned
// in the FIFA draw (December 2025).
//
// When the map is empty or a team is missing, the round falls back to the
// generic "Fase de grupos - Nª rodada" label — so it degrades safely.

export const WORLD_CUP_2026_GROUPS: Record<number, string> = {
  // Group A
  16: "A",   // Mexico
  1531: "A", // South Africa
  17: "A",   // South Korea
  770: "A",  // Czech Republic

  // Group B
  5529: "B", // Canada
  1113: "B", // Bosnia & Herzegovina
  1569: "B", // Qatar
  15: "B",   // Switzerland

  // Group C
  6: "C",    // Brazil
  31: "C",   // Morocco
  2386: "C", // Haiti
  1108: "C", // Scotland

  // Group D
  2384: "D", // USA
  2380: "D", // Paraguay
  20: "D",   // Australia
  777: "D",  // Türkiye

  // Group E
  25: "E",   // Germany
  5530: "E", // Curaçao
  1501: "E", // Ivory Coast
  2382: "E", // Ecuador

  // Group F
  1118: "F", // Netherlands
  12: "F",   // Japan
  5: "F",    // Sweden
  28: "F",   // Tunisia

  // Group G
  1: "G",    // Belgium
  32: "G",   // Egypt
  22: "G",   // Iran
  4673: "G", // New Zealand

  // Group H
  9: "H",    // Spain
  1533: "H", // Cape Verde Islands
  23: "H",   // Saudi Arabia
  7: "H",    // Uruguay

  // Group I
  2: "I",    // France
  13: "I",   // Senegal
  1567: "I", // Iraq
  1090: "I", // Norway

  // Group J
  26: "J",   // Argentina
  1532: "J", // Algeria
  775: "J",  // Austria
  1548: "J", // Jordan

  // Group K
  27: "K",   // Portugal
  1508: "K", // Congo DR
  1568: "K", // Uzbekistan
  8: "K",    // Colombia

  // Group L
  10: "L",   // England
  3: "L",    // Croatia
  1504: "L", // Ghana
  11: "L",   // Panama
};

export function groupForTeam(teamId: number | null | undefined): string {
  if (teamId == null) return "";
  return WORLD_CUP_2026_GROUPS[teamId] ?? "";
}
