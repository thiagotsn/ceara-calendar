export interface IMatch {
  fixture: IFixture;
  league: ILeague;
  teams: ITeams;
  goals: IGoals;
  score: IScore;
}

interface IFixture {
  id: number;
  referee: string;
  date: string;
  timezone: string;
  timestamp: number;
  venue: IVenue;
  status: IStatus;
}

interface IStatus {
  long: string;
  short: string;
  elapsed: number;
}
interface IVenue {
  id: number;
  name: string;
  city: string;
}

interface ILeague {
  id: number;
  name: string;
  country: string;
  season: string;
  round: string;
  // Game number within a numbered knockout round (e.g. 5 → "Jogo 5"), so a
  // feeder placeholder like "Vencedor do Jogo 5 das 16-avos" can be matched to
  // the actual game. Set only for rounds referenced by number; absent otherwise.
  gameNumber?: number;
}

interface ITeams {
  home: ITeam;
  away: ITeam;
}

interface ITeam {
  id: number;
  name: string;
  code?: string;
  winner: boolean;
  // For undecided knockout slots: the two participants of the directly-feeding
  // game. Each is a concrete team (`decided: true`) or a placeholder whose
  // `name` is the raw provider string. Populated only when at least one is
  // decided; absent otherwise.
  feeders?: IFeeder[];
}

interface IFeeder {
  name: string;
  code?: string;
  decided: boolean;
}

interface IGoals {
  home: number;
  away: number;
}

interface IScore {
  penalty: IPenalty;
}

interface IPenalty {
  home: number;
  away: number;
}
