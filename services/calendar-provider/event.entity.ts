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
import { enrichWorldCup2026Venue } from "../../shared/world-cup-2026-venues";
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
  private _homeFeeders: string;
  private _awayFeeders: string;
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
    const home = this._homeFeeders
      ? this._homeFeeders
      : this._homeFlag
      ? `${this._homeTeam} ${this._homeFlag}`
      : this._homeTeam;
    const away = this._awayFeeders
      ? this._awayFeeders
      : this._awayFlag
      ? `${this._awayFlag} ${this._awayTeam}`
      : this._awayTeam;

    if (this._status === MatchEnum.Status.FINISHED_AFTER_PENALTY) {
      return `${home} ${this._homeGoals} (${this._homePenalty}) × (${this._awayPenalty}) ${this._awayGoals} ${away}`;
    }

    if (MatchEnum.StatusFinished.includes(this._status)) {
      return `${home} ${this._homeGoals} × ${this._awayGoals} ${away}`;
    }

    if (MatchEnum.StatusExceptions.includes(this._status)) {
      return `(${MatchEnum.StatusLabels[this._status]}) ${home} × ${away}`;
    }

    return `${home} × ${away}`;
  }
  public get source(): { title: string } {
    return { title: this._status };
  }

  private constructor() {}

  public static create(match: IMatch, nationalTeams: boolean = false): Event {
    const event: Event = new Event();

    const venueFallback = [match.fixture.venue?.name, match.fixture.venue?.city]
      .filter(Boolean)
      .join(", ");

    event._id = match.fixture.id?.toString();
    event._status = (match.fixture.status?.short ??
      MatchEnum.Status.NOT_STARTED) as MatchEnum.Status;
    event._date = match.fixture.date;
    event._league = nationalTeams
      ? translateLeague(match.league?.name)
      : match.league?.name ?? "";
    event._round = nationalTeams
      ? appendGameNumber(
          translateRound(match.league?.round, groupForTeam(match.teams.home?.id)),
          match.league?.gameNumber
        )
      : match.league?.round ?? "";
    event._venue = nationalTeams
      ? enrichWorldCup2026Venue(match.fixture.venue?.name) ?? venueFallback
      : venueFallback;
    event._homeTeam = nationalTeams
      ? resolveTeamName(match.teams.home)
      : match.teams.home.name ?? "";
    event._awayTeam = nationalTeams
      ? resolveTeamName(match.teams.away)
      : match.teams.away.name ?? "";
    event._homeFlag = nationalTeams
      ? flagByCode(match.teams.home.code) ||
        flagForCountry(match.teams.home.name)
      : "";
    event._awayFlag = nationalTeams
      ? flagByCode(match.teams.away.code) ||
        flagForCountry(match.teams.away.name)
      : "";
    event._homeFeeders = nationalTeams
      ? renderFeeders(match.teams.home.feeders)
      : "";
    event._awayFeeders = nationalTeams
      ? renderFeeders(match.teams.away.feeders)
      : "";
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

// Append "- Jogo N" to a knockout round label so feeder placeholders such as
// "Vencedor do Jogo 5 das 16-avos" can be matched to the actual game.
function appendGameNumber(round: string, gameNumber: number | undefined): string {
  if (!round || gameNumber == null) return round;
  return `${round} - Jogo ${gameNumber}`;
}

function resolveTeamName(team: { name: string; code?: string }): string {
  const byCode = countryNameByCode(team.code);
  if (byCode) return byCode;
  const placeholder = translateKnockoutPlaceholder(team.name);
  if (placeholder) return placeholder;
  return countryNamePt(team.name);
}

// For an undecided knockout slot, render its directly-feeding game's two
// participants joined by " OU ": a flag once the team is decided, otherwise the
// participant's Portuguese placeholder text. Returns "" when there are no
// feeders so the slot keeps its own placeholder label.
function renderFeeders(
  feeders: Array<{ name: string; code?: string; decided: boolean }> | undefined
): string {
  if (!feeders || feeders.length === 0) return "";
  return feeders
    .map((f) => {
      if (f.decided) {
        return flagByCode(f.code) || flagForCountry(f.name) || f.name;
      }
      return (
        translateKnockoutPlaceholder(f.name) || countryNamePt(f.name) || f.name
      );
    })
    .join(" OU ");
}
