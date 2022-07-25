import axios from 'axios';
import * as moment from 'moment';

import { IMatchProvider } from './match-provider.interface';
import { IMatch } from './match.interface';

export class ApiFootballDotComService implements IMatchProvider {
  async getMatches(team: number, season: number): Promise<IMatch[]> {
    const result = await axios.get(
      `https://${process.env["api-football-endpoint"]}/fixtures?season=${season}&team=${team}`,
      {
        headers: {
          "x-rapidapi-key": process.env["api-football-key"],
          "x-rapidapi-host": process.env["api-football-endpoint"],
        },
      }
    );

    const matches: IMatch[] = result.data.response;

    return matches;
  }

  async getMatchesFromRange(
    team: number,
    season: number,
    startDate: Date,
    endDate: Date
  ): Promise<IMatch[]> {
    const result = await axios.get(
      `https://${
        process.env["api-football-endpoint"]
      }/fixtures?season=${season}&from=${moment(startDate).format(
        "YYYY-MM-DD"
      )}&to=${moment(endDate).format("YYYY-MM-DD")}&team=${team}`,
      {
        headers: {
          "x-rapidapi-key": process.env["api-football-key"],
          "x-rapidapi-host": process.env["api-football-endpoint"],
        },
      }
    );

    const matches: IMatch[] = result.data.response;

    return matches;
  }
}
