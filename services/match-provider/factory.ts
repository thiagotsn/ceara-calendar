import { MatchSource } from "../../shared/calendars";
import { EspnService } from "./espn.service";
import { IMatchProvider } from "./match-provider.interface";
import { SportsApiProService } from "./sports-api-pro.service";

export function createMatchProvider(source: MatchSource): IMatchProvider {
  switch (source.provider) {
    case "sports-api-pro":
      if (source.kind !== "team" || source.sportsApiProTeamId === undefined) {
        throw new Error(
          "sports-api-pro requires a team-kind source with sportsApiProTeamId"
        );
      }
      return new SportsApiProService(source.sportsApiProTeamId);
    case "espn":
      if (source.kind === "team") {
        return new EspnService({ kind: "team", teamId: source.espnTeamId });
      }
      return new EspnService({
        kind: "league",
        path: source.espnPath,
        dates: source.espnDates,
      });
  }
}
