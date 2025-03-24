import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";

import { ICalendarProvider } from "../../services/calendar-provider/calendar-provider.interface";
import { GoogleCalenderService } from "../../services/calendar-provider/google-calendar.service";
import { ApiFootballDotComService } from "../../services/match-provider/api-football-dot-com.service";
import { IMatchProvider } from "../../services/match-provider/match-provider.interface";
import { IMatchToCalendarService } from "../../services/match-to-calendar/match-to-calendar.interface";
import { MatchToCalendarService } from "../../services/match-to-calendar/match-to-calendar.service";
import TeamsEnum from "../../shared/teams.enum";

export async function resetCalendar(
  _request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log("HTTP trigger function processed a request.");

  const calendarProvider: ICalendarProvider =
    await GoogleCalenderService.create();
  const matchProvider: IMatchProvider = new ApiFootballDotComService();

  const matchToCalendarService: IMatchToCalendarService =
    new MatchToCalendarService(calendarProvider, matchProvider);

  try {
    await matchToCalendarService.resetCalendar(TeamsEnum.Team.CEARA);

    return {
      body: "Calendar reset completed",
    };
  } catch (error) {
    context.error(error);
    return {
      status: 500,
      body: "Calendar reset failed",
    };
  }
}

app.http("ResetCalendar", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: resetCalendar,
});
