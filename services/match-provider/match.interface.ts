export interface IMatch {
  fixture: IFixture;
  league: ILeague;
  teams: ITeams;
  goals: IGoals;
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
}

interface ITeams {
  home: ITeam;
  away: ITeam;
}

interface ITeam {
  id: number;
  name: string;
  winner: boolean;
}

interface IGoals {
  home: number;
  away: number;
}
