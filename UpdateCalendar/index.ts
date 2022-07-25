import {
  AzureFunction,
  Context,
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

const timerTrigger: AzureFunction = async function (
  context: Context,
  myTimer: any
): Promise<void> {
  const calendarProvider: ICalendarProvider =
    await GoogleCalenderService.create();
  const matchProvider: IMatchProvider = new ApiFootballDotComService();

  const matchToCalendarService: IMatchToCalendarService =
    new MatchToCalendarService(calendarProvider, matchProvider);

  try {
    await matchToCalendarService.updateCalendar(TeamsEnum.Team.CEARA);

    context.log("Catalog Updated");
  } catch (error) {
    context.log(error);
  }
};

export default timerTrigger;
