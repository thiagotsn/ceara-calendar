import { concat, find } from "lodash";
import * as moment from "moment";

import { ICalendarProvider } from "../calendar-provider/calendar-provider.interface";
import { Event } from "../calendar-provider/event.entity";
import { IEvent } from "../calendar-provider/event.interface";
import { IMatchProvider } from "../match-provider/match-provider.interface";
import { IMatch } from "../match-provider/match.interface";
import { IMatchToCalendarService } from "./match-to-calendar.interface";

export class MatchToCalendarService implements IMatchToCalendarService {
  private calendarProvider: ICalendarProvider;
  private matchProvider: IMatchProvider;

  constructor(
    calendarProvider: ICalendarProvider,
    matchProvider: IMatchProvider
  ) {
    this.calendarProvider = calendarProvider;
    this.matchProvider = matchProvider;
  }

  async updateCalendar(team: number): Promise<void> {
    const currentYear: number = moment().year();
    const startDate: Date = moment().subtract(1, "month").toDate();
    const startOfCurrentYear: Date = moment().startOf("year").toDate();
    const endOfCurrentYear: Date = moment().endOf("year").toDate();

    const nextYear: number = currentYear + 1;
    const startOfNextYear: Date = moment()
      .startOf("year")
      .add(1, "year")
      .toDate();
    const endOfNextYear: Date = moment().endOf("year").add(1, "year").toDate();

    const matches: IMatch[] = await this.matchProvider.getMatchesFromRange(
      team,
      currentYear,
      startDate,
      endOfCurrentYear
    );

    const matchesNextYear: IMatch[] =
      await this.matchProvider.getMatchesFromRange(
        team,
        nextYear,
        startOfNextYear,
        endOfNextYear
      );

    const eventsToUpdate: IEvent[] = concat(matches, matchesNextYear).map(
      (match) => Event.create(match)
    );

    const eventsInCalendar: IEvent[] = await this.calendarProvider.getEvents(
      startOfCurrentYear,
      endOfNextYear
    );

    for (let index = 0; index < eventsToUpdate.length; index++) {
      const event = eventsToUpdate[index];

      const eventInCalendar: IEvent | undefined = find(eventsInCalendar, {
        id: event.id,
      });

      if (eventInCalendar) {
        await this.calendarProvider.updateEvent(event);
      } else {
        await this.calendarProvider.addEvent(event);
      }
    }
  }

  async resetCalendar(team: number): Promise<void> {
    const events: IEvent[] = await this.calendarProvider.getAllEvents();

    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      await this.calendarProvider.deleteEvent(event.id);
    }

    const currentYear = moment().year();
    const matches: IMatch[] = await this.matchProvider.getMatches(
      team,
      currentYear
    );

    const eventsToAdd: Event[] = matches.map((match) => Event.create(match));

    for (let index = 0; index < eventsToAdd.length; index++) {
      const event = eventsToAdd[index];
      await this.calendarProvider.updateEvent(event);
    }
  }
}
