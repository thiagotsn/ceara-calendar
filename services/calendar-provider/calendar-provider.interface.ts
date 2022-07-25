import { IEvent } from './event.interface';

export interface ICalendarProvider {
  getAllEvents(): Promise<IEvent[]>;
  getEvents(startDate: Date, endDate: Date): Promise<IEvent[]>;
  addEvent(event: IEvent): Promise<string>;
  updateEvent(event: IEvent): Promise<string>;
  deleteEvent(eventId: string): Promise<void>;
}
