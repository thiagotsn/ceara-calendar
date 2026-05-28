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
    const url = `https://${endpoint}/fixtures?${queryString}`;
    console.log(`[api-football] GET ${url}`);
    const response = await fetch(url, {
      headers: {
        "x-rapidapi-key": process.env["API_FOOTBALL_KEY"] ?? "",
        "x-rapidapi-host": endpoint,
      },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "<unreadable body>");
      throw new Error(
        `API-Football request failed: ${response.status} ${response.statusText} — ${text}`
      );
    }

    const body = (await response.json()) as {
      response?: IMatch[];
      results?: number;
      errors?: unknown;
      message?: unknown;
    };
    const matches = body.response ?? [];
    console.log(
      `[api-football] ${response.status} results=${matches.length}` +
        (body.errors && Object.keys(body.errors as object).length > 0
          ? ` errors=${JSON.stringify(body.errors)}`
          : "") +
        (body.message ? ` message=${JSON.stringify(body.message)}` : "")
    );
    return matches;
  }
}
