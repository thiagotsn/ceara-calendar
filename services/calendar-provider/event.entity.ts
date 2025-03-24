import moment = require("moment");

import MatchEnum from "../match-provider/match.enum";
import { IMatch } from "../match-provider/match.interface";
import { IEvent, IEventDateTime } from "./event.interface";

export class Event implements IEvent {
  private _id: string;
  private _date: string;
  private _league: string;
  private _venue: string;
  private _status: MatchEnum.Status;
  private _homeTeam: string;
  private _awayTeam: string;
  private _homeGoals: number;
  private _awayGoals: number;
  private _homePenalty: number;
  private _awayPenalty: number;

  public get id(): string {
    return this._id;
  }
  public get start(): IEventDateTime {
    return this.convertDate(this._date, this._status);
  }
  public get end(): IEventDateTime {
    return this.convertDate(this._date, this._status, 2);
  }
  public get location(): string {
    return this._venue;
  }
  public get description(): string {
    const description: string = `${
      this._status === MatchEnum.Status.TO_BE_DETERMINED ? "TBD" : ""
    }${
      MatchEnum.StatusExceptions.includes(this._status)
        ? MatchEnum.StatusLabels[this._status]
        : ""
    }\nCampeonato: ${
      this._league
    }\n\n\nCalendário desatualizado? Por favor, envie um email para calendarioceara@gmail.com`;

    return description;
  }
  public get summary(): string {
    if (this._status === MatchEnum.Status.FINISHED_AFTER_PENALTY) {
      return `${this._homeTeam} ${this._homeGoals} (${this._homePenalty}) X (${this._awayPenalty}) ${this._awayGoals} ${this._awayTeam}`;
    }

    if (MatchEnum.StatusFinished.includes(this._status)) {
      return `${this._homeTeam} ${this._homeGoals} X ${this._awayGoals} ${this._awayTeam}`;
    }

    if (MatchEnum.StatusExceptions.includes(this._status)) {
      return `(${MatchEnum.StatusLabels[this._status]}) ${this._homeTeam} X ${
        this._awayTeam
      }`;
    }

    return `${this._homeTeam} X ${this._awayTeam}`;
  }
  public get source(): { title: string } {
    return { title: this._status };
  }

  private constructor() {}

  public static create(match: IMatch): Event {
    const event: Event = new Event();

    event._id = match.fixture.id?.toString();
    event._status = (match.fixture.status?.short ??
      MatchEnum.Status.NOT_STARTED) as MatchEnum.Status;
    event._date = match.fixture.date;
    event._league = match.league?.name ?? "";
    event._venue = match.fixture.venue?.name ?? "";
    event._homeTeam = match.teams.home.name;
    event._awayTeam = match.teams.away.name;
    event._homeGoals = match.goals.home;
    event._awayGoals = match.goals.away;
    event._homePenalty = match.score.penalty?.home ?? 0;
    event._awayPenalty = match.score.penalty?.away ?? 0;

    return event;
  }

  private convertDate(
    date: string,
    status: MatchEnum.Status,
    offset: number = 0
  ): IEventDateTime {
    if (
      status === MatchEnum.Status.TO_BE_DETERMINED ||
      MatchEnum.StatusExceptions.includes(status)
    ) {
      return {
        date: moment(date).format("YYYY-MM-DD"),
      };
    }

    return {
      dateTime: moment(date).add(offset, "hours").toISOString(),
      timeZone: "UTC",
    };
  }
}
