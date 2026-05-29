import dayjs = require("dayjs");

import { CalendarConfig, MatchSource } from "../../shared/calendars";
import { ICalendarProvider } from "../calendar-provider/calendar-provider.interface";
import { Event } from "../calendar-provider/event.entity";
import { IEvent } from "../calendar-provider/event.interface";
import { IMatchProvider } from "../match-provider/match-provider.interface";
import { IMatch } from "../match-provider/match.interface";
import { IMatchToCalendarService } from "./match-to-calendar.interface";

interface SyncWindow {
  matches: IMatch[];
  existingEventsStart: Date;
  existingEventsEnd: Date;
}

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

  async updateCalendar(config: CalendarConfig): Promise<void> {
    const window = await this.fetchSyncWindow(config.source);

    const eventsToUpdate: IEvent[] = window.matches.map((match) =>
      Event.create(match)
    );

    const eventsInCalendar: IEvent[] = await this.calendarProvider.getEvents(
      window.existingEventsStart,
      window.existingEventsEnd
    );

    for (const event of eventsToUpdate) {
      const eventInCalendar: IEvent | undefined = eventsInCalendar.find(
        (e) => e.id === event.id
      );

      if (eventInCalendar) {
        await this.calendarProvider.updateEvent(event);
      } else {
        await this.calendarProvider.addEvent(event);
      }
    }
  }

  async resetCalendar(config: CalendarConfig): Promise<void> {
    const events: IEvent[] = await this.calendarProvider.getAllEvents();

    for (const event of events) {
      await this.calendarProvider.deleteEvent(event.id);
    }

    const matches: IMatch[] = await this.fetchCurrentSeasonMatches(
      config.source
    );

    const eventsToAdd: Event[] = matches.map((match) => Event.create(match));

    for (const event of eventsToAdd) {
      await this.calendarProvider.addEvent(event);
    }
  }

  private async fetchSyncWindow(source: MatchSource): Promise<SyncWindow> {
    if (source.kind === "team") {
      const currentYear = dayjs().year();
      const startDate = dayjs().subtract(1, "month").toDate();
      const startOfCurrentYear = dayjs().startOf("year").toDate();
      const endOfCurrentYear = dayjs().endOf("year").toDate();

      const nextYear = currentYear + 1;
      const startOfNextYear = dayjs().startOf("year").add(1, "year").toDate();
      const endOfNextYear = dayjs().endOf("year").add(1, "year").toDate();

      const matchesCurrent = await this.matchProvider.getFixtures({
        season: currentYear,
        from: startDate,
        to: endOfCurrentYear,
      });
      const matchesNext = await this.matchProvider.getFixtures({
        season: nextYear,
        from: startOfNextYear,
        to: endOfNextYear,
      });

      return {
        matches: [...matchesCurrent, ...matchesNext],
        existingEventsStart: startOfCurrentYear,
        existingEventsEnd: endOfNextYear,
      };
    }

    const matches = await this.matchProvider.getFixtures({
      season: source.season,
    });

    return {
      matches,
      existingEventsStart: dayjs(`${source.season}-01-01`)
        .startOf("year")
        .toDate(),
      existingEventsEnd: dayjs(`${source.season}-01-01`).endOf("year").toDate(),
    };
  }

  private async fetchCurrentSeasonMatches(
    source: MatchSource
  ): Promise<IMatch[]> {
    if (source.kind === "team") {
      return this.matchProvider.getFixtures({
        season: dayjs().year(),
      });
    }

    return this.matchProvider.getFixtures({
      season: source.season,
    });
  }
}
