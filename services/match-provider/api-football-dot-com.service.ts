import dayjs = require("dayjs");

import { FixturesQuery, IMatchProvider } from "./match-provider.interface";
import { IMatch } from "./match.interface";

export class ApiFootballDotComService implements IMatchProvider {
  async getFixtures(query: FixturesQuery): Promise<IMatch[]> {
    const params: Record<string, string> = {
      season: String(query.season),
    };
    if (query.team !== undefined) {
      params.team = String(query.team);
    }
    if (query.league !== undefined) {
      params.league = String(query.league);
    }
    if (query.from) {
      params.from = dayjs(query.from).format("YYYY-MM-DD");
    }
    if (query.to) {
      params.to = dayjs(query.to).format("YYYY-MM-DD");
    }

    const endpoint = process.env["API_FOOTBALL_ENDPOINT"] ?? "";
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `https://${endpoint}/fixtures?${queryString}`,
      {
        headers: {
          "x-rapidapi-key": process.env["API_FOOTBALL_KEY"] ?? "",
          "x-rapidapi-host": endpoint,
        },
      }
    );

    if (!response.ok) {
      throw new Error(
        `API-Football request failed: ${response.status} ${response.statusText}`
      );
    }

    const body = (await response.json()) as { response: IMatch[] };
    return body.response;
  }
}
