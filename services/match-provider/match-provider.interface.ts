import { IMatch } from './match.interface';

export interface IMatchProvider {
  getMatches(team: number, season: number): Promise<IMatch[]>;
  getMatchesFromRange(
    team: number,
    season: number,
    startDate: Date,
    endDate: Date
  ): Promise<IMatch[]>;
}
