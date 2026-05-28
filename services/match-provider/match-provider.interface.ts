import { IMatch } from './match.interface';

export interface FixturesQuery {
  season: number;
  team?: number;
  league?: number;
  from?: Date;
  to?: Date;

  // ESPN-specific identifiers. Ignored by API-Football.
  espnTeamId?: number;
  espnPath?: string;
  espnDates?: string;
}

export interface IMatchProvider {
  getFixtures(query: FixturesQuery): Promise<IMatch[]>;
}
