import { CalendarConfig } from "../../shared/calendars";

export interface IMatchToCalendarService {
  updateCalendar(config: CalendarConfig): Promise<void>;
  resetCalendar(config: CalendarConfig): Promise<void>;
}
