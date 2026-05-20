// Translates API-Football's English "round" strings into Brazilian Portuguese.
// Unknown strings fall through untouched so unfamiliar competitions still show
// something readable.

const ROUND_BY_KEY: Record<string, string> = {
  "round of 32": "16-avos de final",
  "round of 16": "Oitavas de final",
  "quarter-finals": "Quartas de final",
  quarterfinals: "Quartas de final",
  "semi-finals": "Semifinal",
  semifinals: "Semifinal",
  "3rd place final": "Disputa pelo 3º lugar",
  "third place final": "Disputa pelo 3º lugar",
  final: "Final",
  "preliminary round": "Eliminatórias",
  "play-offs": "Playoffs",
  playoffs: "Playoffs",
};

export function translateRound(
  round: string | null | undefined,
  group?: string
): string {
  if (!round) return "";
  const key = round.trim().toLowerCase();
  if (!key) return "";

  const regularSeason = key.match(/^regular season - (\d+)$/);
  if (regularSeason) return `Rodada ${regularSeason[1]}`;

  const groupStage = key.match(/^group stage - (\d+)$/);
  if (groupStage) {
    const prefix = group ? `Grupo ${group}` : "Fase de grupos";
    return `${prefix} - ${groupStage[1]}ª rodada`;
  }

  return ROUND_BY_KEY[key] ?? round;
}
