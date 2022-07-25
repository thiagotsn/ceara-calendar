export interface IMatchToCalendarService {
  updateCalendar(team: number): Promise<void>;
  resetCalendar(team: number): Promise<void>;
}
