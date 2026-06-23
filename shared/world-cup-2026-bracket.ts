// Hardcoded FIFA World Cup 2026 Round-of-32 game numbering.
//
// ESPN references knockout feeders by game number inside competitor display
// names ("Round of 32 4 Winner"). For the Round of 16, Quarterfinals and
// Semifinals, ESPN's game number equals the event's rank by id within the round
// — but for the Round of 32 it does NOT. ESPN numbers those by FIFA match number
// (matches 73–88 → games 1–16), which is a different order than the event ids,
// so naive id-rank pairs the wrong R32 games into an R16 slot.
//
// Keys are ESPN scoreboard event ids (also reused as the Google Calendar event
// ids), values are the FIFA-aligned R32 game number (1–16). The group-position
// signature for each match is noted for traceability. Resolved from the FIFA
// official bracket (Wikipedia "2026 FIFA World Cup knockout stage").
//
// Unknown ids fall back to no resolution (the slot keeps its placeholder text),
// so this degrades safely if ESPN ever reissues ids.
export const WORLD_CUP_2026_ROUND_OF_32_GAME_NUMBER: Record<number, number> = {
  760486: 1, //  M73: 2A v 2B
  760489: 2, //  M74: 1E v 3rd(A/B/C/D/F)
  760488: 3, //  M75: 1F v 2C
  760487: 4, //  M76: 1C v 2F
  760492: 5, //  M77: 1I v 3rd(C/D/F/G/H)
  760490: 6, //  M78: 2E v 2I
  760491: 7, //  M79: 1A v 3rd(C/E/F/H/I)
  760495: 8, //  M80: 1L v 3rd(E/H/I/J/K)
  760494: 9, //  M81: 1D v 3rd(B/E/F/I/J)
  760493: 10, // M82: 1G v 3rd(A/E/H/I/J)
  760496: 11, // M83: 2K v 2L
  760497: 12, // M84: 1H v 2J
  760498: 13, // M85: 1B v 3rd(E/F/G/I/J)
  760501: 14, // M86: 1K v 3rd(D/E/I/J/L)
  760500: 15, // M87: 1J v 2H
  760499: 16, // M88: 2D v 2G
};

export function round32GameNumber(
  eventId: number | null | undefined
): number | null {
  if (eventId == null) return null;
  return WORLD_CUP_2026_ROUND_OF_32_GAME_NUMBER[eventId] ?? null;
}
