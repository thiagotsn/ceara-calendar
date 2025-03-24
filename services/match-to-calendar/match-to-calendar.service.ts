import { concat, find } from "lodash";
import * as moment from "moment";

import MatchesEnum from "../../shared/matches.enum";
import { ICalendarProvider } from "../calendar-provider/calendar-provider.interface";
import { IEvent, IEventDateTime } from "../calendar-provider/event.interface";
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

    const eventsToUpdate: IEvent[] = this.mapMatchesToEvents(
      concat(matches, matchesNextYear)
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

    const eventsToAdd: IEvent[] = this.mapMatchesToEvents(matches);

    for (let index = 0; index < eventsToAdd.length; index++) {
      const event = eventsToAdd[index];
      await this.calendarProvider.updateEvent(event);
    }
  }

  private mapMatchesToEvents(matches: IMatch[]): IEvent[] {
    let events: IEvent[] = [];

    events = matches.map((match) => {
      const event: IEvent = {
        id: match.fixture.id?.toString(),
        summary: this.matchSummary(match),
        description: this.matchDescription(match),
        location: match.fixture.venue?.name,
        start: this.matchStartDate(match),
        end: this.matchEndDate(match),
        source: {
          title: match.fixture.status?.short,
        },
      };
      return event;
    });

    return events;
  }

  private matchDescription(match: IMatch): string {
    const description: string = `${
      match.fixture.status?.short === MatchesEnum.Status.TBD ? "TBD\n" : ""
    }${
      match.fixture.status?.short === MatchesEnum.Status.PST ? "Adiado\n" : ""
    }Campeonato: ${
      match.league?.name
    }\n\n\nCalendário desatualizado? Por favor, envie um email para calendarioceara@gmail.com`;

    return description;
  }

  private matchStartDate(match: IMatch): IEventDateTime {
    if (
      match.fixture.status?.short === MatchesEnum.Status.TBD ||
      match.fixture.status?.short === MatchesEnum.Status.PST
    ) {
      return {
        date: moment(match.fixture.date).format("YYYY-MM-DD"),
      };
    }

    return {
      dateTime: moment(match.fixture.date).toISOString(),
      timeZone: "UTC",
    };
  }

  private matchEndDate(match: IMatch): IEventDateTime {
    if (
      match.fixture.status?.short === MatchesEnum.Status.TBD ||
      match.fixture.status?.short === MatchesEnum.Status.PST
    ) {
      return {
        date: moment(match.fixture.date).format("YYYY-MM-DD"),
      };
    }

    return {
      dateTime: moment(match.fixture.date).add(2, "hours").toISOString(),
      timeZone: "UTC",
    };
  }

  private matchSummary(match: IMatch): string {
    if (
      match.fixture.status?.short === MatchesEnum.Status.FINISHED ||
      match.fixture.status?.short ===
        MatchesEnum.Status.FINISHED_AFTER_EXTRA_TIME
    ) {
      return `${match.teams.home.name} ${match.goals.home} X ${match.goals.away} ${match.teams.away.name}`;
    } else if (
      match.fixture.status?.short === MatchesEnum.Status.FINISHED_AFTER_PENALTY
    ) {
      return `${match.teams.home.name} ${match.goals.home} (${match.score.penalty.home}) X (${match.score.penalty.away}) ${match.goals.away} ${match.teams.away.name}`;
    } else if (match.fixture.status?.short === MatchesEnum.Status.PST) {
      return `(ADIADO) ${match.teams.home.name} X ${match.teams.away.name}`;
    }

    return `${match.teams.home.name} X ${match.teams.away.name}`;
  }
}
