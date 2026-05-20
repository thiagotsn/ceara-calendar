import { IMatch } from './match.interface';

export interface FixturesQuery {
  season: number;
  team?: number;
  league?: number;
  from?: Date;
  to?: Date;
}

export interface IMatchProvider {
  getFixtures(query: FixturesQuery): Promise<IMatch[]>;
}
