// TEMPORARY — hardcoded team → group map for FIFA World Cup 2026.
//
// The scoreboard endpoint does not return the group letter, so until we wire
// up a standings call (or the tournament ends, whichever comes first), this
// file is the single source of truth.
//
// Keys are ESPN team IDs (visible in
// /sports/soccer/fifa.world/scoreboard → events[].competitions[0]
//   .competitors[].team.id). Values are the group letter A–L assigned in the
// FIFA draw (December 2025).
//
// When the map is empty or a team is missing, the round falls back to the
// generic "Fase de grupos" label — so it degrades safely.

export const WORLD_CUP_2026_GROUPS: Record<number, string> = {
  // Group A
  203: "A",    // Mexico
  467: "A",    // South Africa
  451: "A",    // South Korea
  450: "A",    // Czechia

  // Group B
  206: "B",    // Canada
  452: "B",    // Bosnia-Herzegovina
  4398: "B",   // Qatar
  475: "B",    // Switzerland

  // Group C
  205: "C",    // Brazil
  2869: "C",   // Morocco
  2654: "C",   // Haiti
  580: "C",    // Scotland

  // Group D
  660: "D",    // United States
  210: "D",    // Paraguay
  628: "D",    // Australia
  465: "D",    // Türkiye

  // Group E
  481: "E",    // Germany
  11678: "E",  // Curacao
  4789: "E",   // Ivory Coast
  209: "E",    // Ecuador

  // Group F
  449: "F",    // Netherlands
  627: "F",    // Japan
  466: "F",    // Sweden
  659: "F",    // Tunisia

  // Group G
  459: "G",    // Belgium
  2620: "G",   // Egypt
  469: "G",    // Iran
  2666: "G",   // New Zealand

  // Group H
  164: "H",    // Spain
  2597: "H",   // Cape Verde
  655: "H",    // Saudi Arabia
  212: "H",    // Uruguay

  // Group I
  478: "I",    // France
  654: "I",    // Senegal
  4375: "I",   // Iraq
  464: "I",    // Norway

  // Group J
  202: "J",    // Argentina
  624: "J",    // Algeria
  474: "J",    // Austria
  2917: "J",   // Jordan

  // Group K
  482: "K",    // Portugal
  2850: "K",   // Congo DR
  2570: "K",   // Uzbekistan
  208: "K",    // Colombia

  // Group L
  448: "L",    // England
  477: "L",    // Croatia
  4469: "L",   // Ghana
  2659: "L",   // Panama
};

export function groupForTeam(teamId: number | null | undefined): string {
  if (teamId == null) return "";
  return WORLD_CUP_2026_GROUPS[teamId] ?? "";
}
