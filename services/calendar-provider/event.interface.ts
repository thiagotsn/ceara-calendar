export interface IEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  start: IEventDateTime;
  end: IEventDateTime;
  source: IEventSource;
}

export interface IEventDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

interface IEventSource {
  title: string;
}
