namespace MatchEnum {
  export enum Status {
    FINISHED = "FT",
    FINISHED_AFTER_EXTRA_TIME = "AET",
    FINISHED_AFTER_PENALTY = "PEN",
    TO_BE_DETERMINED = "TBD",
    POSTPONED = "PST",
    SUSPENDED = "SUSP",
    INTERRUPTED = "INT",
    CANCELLED = "CANC",
    ABANDONED = "ABD",
    TECHNICAL_LOSS = "AWD",
    WALKOVER = "WO",
    NOT_STARTED = "NS",
    FIRST_HALF = "1H",
    HALFTIME = "HT",
    SECOND_HALF = "2H",
    EXTRA_TIME = "ET",
    BREAK_TIME = "BT",
    PENALTY_IN_PROGRESS = "P",
    LIVE = "LIVE",
  }

  export const StatusLabels = {
    [Status.POSTPONED]: "ADIADO",
    [Status.SUSPENDED]: "SUSPENSO",
    [Status.INTERRUPTED]: "INTERROMPIDO",
    [Status.CANCELLED]: "CANCELADO",
    [Status.ABANDONED]: "ABANDONADO",
    [Status.TECHNICAL_LOSS]: "DERROTA TÉCNICA",
    [Status.WALKOVER]: "W.O.",
  };

  export const StatusExceptions = [
    Status.POSTPONED,
    Status.SUSPENDED,
    Status.INTERRUPTED,
    Status.CANCELLED,
    Status.ABANDONED,
    Status.TECHNICAL_LOSS,
    Status.WALKOVER,
  ];

  export const StatusFinished = [
    Status.FINISHED,
    Status.FINISHED_AFTER_EXTRA_TIME,
    Status.FINISHED_AFTER_PENALTY,
  ];
}

export default MatchEnum;
