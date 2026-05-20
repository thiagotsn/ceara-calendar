import { calendar_v3, google } from 'googleapis';

import { ServiceAccountKeys } from '../../shared/calendars';
import { ICalendarProvider } from './calendar-provider.interface';
import { IEvent } from './event.interface';

export interface GoogleCalendarOptions {
  calendarId: string;
  keys: ServiceAccountKeys;
  serviceAccount?: string;
}

export class GoogleCalenderService implements ICalendarProvider {
  private calendar: calendar_v3.Calendar;
  private calendarId: string;

  private constructor(calendarId: string) {
    this.calendarId = calendarId;
  }

  async getAllEvents(): Promise<IEvent[]> {
    const result = await this.calendar.events.list({
      calendarId: this.calendarId,
    });

    const events: IEvent[] = this.mapEvents(result.data.items);

    return events;
  }

  async getEvents(startDate: Date, endDate: Date): Promise<IEvent[]> {
    const result = await this.calendar.events.list({
      calendarId: this.calendarId,
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
      calendarId: this.calendarId,
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
      calendarId: this.calendarId,
      requestBody: eventToUpdate,
      eventId: event.id,
    });

    return result.data.id;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.calendar.events.delete({
      calendarId: this.calendarId,
      eventId: eventId,
    });
  }

  public static async create(
    opts: GoogleCalendarOptions
  ): Promise<GoogleCalenderService> {
    const service = new GoogleCalenderService(opts.calendarId);

    const authClient = await this.authenticate(opts.keys, opts.serviceAccount);
    service.calendar = google.calendar({
      version: "v3",
      auth: authClient,
    });

    return service;
  }

  private static async authenticate(
    keys: ServiceAccountKeys,
    serviceAccount: string | undefined
  ): Promise<any> {
    const authClient = new google.auth.JWT({
      subject: serviceAccount || undefined,
      email: keys.client_email,
      key: keys.private_key,
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
