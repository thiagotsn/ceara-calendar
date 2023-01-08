import {
  calendar_v3,
  google,
} from 'googleapis';
import * as path from 'path';

import TeamsEnum from '../../shared/teams.enum';
import { ICalendarProvider } from './calendar-provider.interface';
import { IEvent } from './event.interface';

export class GoogleCalenderService implements ICalendarProvider {
  private calendar: calendar_v3.Calendar;

  private constructor() {}

  async getAllEvents(): Promise<IEvent[]> {
    const result = await this.calendar.events.list({
      calendarId: TeamsEnum.TeamCalendar[TeamsEnum.Team.CEARA],
    });

    const events: IEvent[] = this.mapEvents(result.data.items);

    return events;
  }

  async getEvents(startDate: Date, endDate: Date): Promise<IEvent[]> {
    const result = await this.calendar.events.list({
      calendarId: TeamsEnum.TeamCalendar[TeamsEnum.Team.CEARA],
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
    });

    const events: IEvent[] = this.mapEvents(result.data.items);

    return events;
  }

  async addEvent(event: IEvent): Promise<string> {
    const eventToAdd: calendar_v3.Schema$Event = {
      id: event.id,
      summary: event.summary,
      location: event.location,
      description: event.description,
      start: {
        date: event.start.date,
        dateTime: event.start.dateTime,
        timeZone: event.start.timeZone,
      },
      end: {
        date: event.end.date,
        dateTime: event.end.dateTime,
        timeZone: event.end.timeZone,
      },
    };

    const result = await this.calendar.events.insert({
      calendarId: TeamsEnum.TeamCalendar[TeamsEnum.Team.CEARA],
      requestBody: eventToAdd,
    });

    return result.data.id;
  }

  async updateEvent(event: IEvent): Promise<string> {
    const eventToUpdate: calendar_v3.Schema$Event = {
      id: event.id,
      summary: event.summary,
      location: event.location,
      description: event.description,
      start: {
        date: event.start.date,
        dateTime: event.start.dateTime,
        timeZone: event.start.timeZone,
      },
      end: {
        date: event.end.date,
        dateTime: event.end.dateTime,
        timeZone: event.end.timeZone,
      },
    };

    const result = await this.calendar.events.update({
      calendarId: TeamsEnum.TeamCalendar[TeamsEnum.Team.CEARA],
      requestBody: eventToUpdate,
      eventId: event.id,
    });

    return result.data.id;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const result = await this.calendar.events.delete({
      calendarId: TeamsEnum.TeamCalendar[TeamsEnum.Team.CEARA],
      eventId: eventId,
    });
  }

  public static async create(): Promise<GoogleCalenderService> {
    const googleCalendarService = new GoogleCalenderService();

    const authClient = await this.authenticate();
    googleCalendarService.calendar = google.calendar({
      version: "v3",
      auth: authClient,
    });

    return googleCalendarService;
  }

  private static async authenticate(): Promise<any> {
    const authClient = new google.auth.JWT({
      subject: process.env["google-service-account"],
      keyFile: path.join(__dirname, "../../../keys.json"),
      scopes: ["https://www.googleapis.com/auth/calendar"],
    });

    await authClient.authorize();

    return authClient;
  }

  private mapEvents(events: calendar_v3.Schema$Event[]): IEvent[] {
    return events.map((event: calendar_v3.Schema$Event) => {
      return this.mapEvent(event);
    });
  }

  private mapEvent(event: calendar_v3.Schema$Event): IEvent {
    return {
      id: event.id,
      summary: event.summary,
      description: event.description,
      location: event.location ?? "",
      start: {
        date: event.start.date,
        dateTime: event.start.dateTime,
        timeZone: event.start.timeZone,
      },
      end: {
        date: event.end.date,
        dateTime: event.end.dateTime,
        timeZone: event.end.timeZone,
      },
      source: {
        title: event.source?.title,
      },
    };
  }
}
