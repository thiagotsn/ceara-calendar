import dayjs = require("dayjs");

import {
  countryNameByCode,
  countryNamePt,
  flagByCode,
  flagForCountry,
  translateKnockoutPlaceholder,
} from "../../shared/country-flags";
import { translateLeague } from "../../shared/leagues";
import { translateRound } from "../../shared/rounds";
import { groupForTeam } from "../../shared/world-cup-2026-groups";
import MatchEnum from "../match-provider/match.enum";
import { IMatch } from "../match-provider/match.interface";
import { IEvent, IEventDateTime } from "./event.interface";

export class Event implements IEvent {
  private _id: string;
  private _date: string;
  private _league: string;
  private _round: string;
  private _venue: string;
  private _status: MatchEnum.Status;
  private _homeTeam: string;
  private _awayTeam: string;
  private _homeFlag: string;
  private _awayFlag: string;
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
      this._status === MatchEnum.Status.TO_BE_DETERMINED ? "A DEFINIR" : ""
    }${
      MatchEnum.StatusExceptions.includes(this._status)
        ? MatchEnum.StatusLabels[this._status]
        : ""
    }\nCampeonato: ${this._league}${
      this._round ? `\nFase: ${this._round}` : ""
    }${
      this._venue ? `\nEstádio: ${this._venue}` : ""
    }\n\n\nCalendário desatualizado? Por favor, envie um email para calendarioceara@gmail.com`;

    return description;
  }
  public get summary(): string {
    const home = this._homeFlag
      ? `${this._homeTeam} ${this._homeFlag}`
      : this._homeTeam;
    const away = this._awayFlag
      ? `${this._awayFlag} ${this._awayTeam}`
      : this._awayTeam;

    if (this._status === MatchEnum.Status.FINISHED_AFTER_PENALTY) {
      return `${home} ${this._homeGoals} (${this._homePenalty}) X (${this._awayPenalty}) ${this._awayGoals} ${away}`;
    }

    if (MatchEnum.StatusFinished.includes(this._status)) {
      return `${home} ${this._homeGoals} X ${this._awayGoals} ${away}`;
    }

    if (MatchEnum.StatusExceptions.includes(this._status)) {
      return `(${MatchEnum.StatusLabels[this._status]}) ${home} X ${away}`;
    }

    return `${home} X ${away}`;
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
    event._league = translateLeague(match.league?.name);
    event._round = translateRound(
      match.league?.round,
      groupForTeam(match.teams.home?.id)
    );
    event._venue = [match.fixture.venue?.name, match.fixture.venue?.city]
      .filter(Boolean)
      .join(", ");
    event._homeTeam = resolveTeamName(match.teams.home);
    event._awayTeam = resolveTeamName(match.teams.away);
    event._homeFlag =
      flagByCode(match.teams.home.code) ||
      flagForCountry(match.teams.home.name);
    event._awayFlag =
      flagByCode(match.teams.away.code) ||
      flagForCountry(match.teams.away.name);
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
        date: dayjs(date).format("YYYY-MM-DD"),
      };
    }

    return {
      dateTime: dayjs(date).add(offset, "hour").toISOString(),
      timeZone: "UTC",
    };
  }
}

function resolveTeamName(team: { name: string; code?: string }): string {
  const byCode = countryNameByCode(team.code);
  if (byCode) return byCode;
  const placeholder = translateKnockoutPlaceholder(team.name);
  if (placeholder) return placeholder;
  return countryNamePt(team.name);
}
