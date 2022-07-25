import {
  AzureFunction,
  Context,
  HttpRequest,
} from '@azure/functions';

import {
  ICalendarProvider,
} from '../services/calendar-provider/calendar-provider.interface';
import {
  GoogleCalenderService,
} from '../services/calendar-provider/google-calendar.service';
import {
  ApiFootballDotComService,
} from '../services/match-provider/api-football-dot-com.service';
import {
  IMatchProvider,
} from '../services/match-provider/match-provider.interface';
import {
  IMatchToCalendarService,
} from '../services/match-to-calendar/match-to-calendar.interface';
import {
  MatchToCalendarService,
} from '../services/match-to-calendar/match-to-calendar.service';
import TeamsEnum from '../shared/teams.enum';

const httpTrigger: AzureFunction = async function (
  context: Context,
  req: HttpRequest
): Promise<void> {
  context.log("HTTP trigger function processed a request.");

  const calendarProvider: ICalendarProvider =
    await GoogleCalenderService.create();
  const matchProvider: IMatchProvider = new ApiFootballDotComService();

  const matchToCalendarService: IMatchToCalendarService =
    new MatchToCalendarService(calendarProvider, matchProvider);

  try {
    await matchToCalendarService.resetCalendar(TeamsEnum.Team.CEARA);

    context.res = {
      body: "Calendar reset completed",
    };
  } catch (error) {
    context.log(error);
    context.res = {
      status: 500,
      body: "Calendar reset failed",
    };
  }
};

export default httpTrigger;
