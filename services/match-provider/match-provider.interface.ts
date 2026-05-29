import { IMatch } from './match.interface';

export interface FixturesQuery {
  from?: Date;
  to?: Date;
  // API-Football needs a season number; active providers ignore it.
  season?: number;
}

export interface IMatchProvider {
  getFixtures(query: FixturesQuery): Promise<IMatch[]>;
}
