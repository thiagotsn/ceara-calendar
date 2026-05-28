import { GoogleCalenderService } from "../services/calendar-provider/google-calendar.service";
import { ApiFootballDotComService } from "../services/match-provider/api-football-dot-com.service";
import { MatchToCalendarService } from "../services/match-to-calendar/match-to-calendar.service";
import {
  CALENDARS,
  CalendarConfig,
  MatchSource,
  resolveCalendar,
} from "../shared/calendars";

function describeSource(source: MatchSource): string {
  return source.kind === "team"
    ? `team ${source.teamId}`
    : `league ${source.leagueId} season ${source.season}`;
}

async function updateOne(config: CalendarConfig): Promise<void> {
  const resolved = resolveCalendar(config);
  const calendarProvider = await GoogleCalenderService.create({
    calendarId: resolved.calendarId,
    keys: resolved.keys,
    serviceAccount: resolved.serviceAccount,
  });
  const matchProvider = new ApiFootballDotComService();
  const service = new MatchToCalendarService(calendarProvider, matchProvider);

  await service.updateCalendar(config);
}

async function main(): Promise<void> {
  const failures: { key: string; source: string; error: unknown }[] = [];

  for (const config of CALENDARS) {
    const source = describeSource(config.source);
    const startedAt = Date.now();
    console.log(`[${config.key}] updating (${source})...`);
    try {
      await updateOne(config);
      console.log(`[${config.key}] done in ${Date.now() - startedAt}ms`);
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      const message =
        error instanceof Error ? error.stack ?? error.message : String(error);
      console.error(
        `[${config.key}] failed after ${elapsed}ms (${source}): ${message}`
      );
      failures.push({ key: config.key, source, error });
    }
  }

  if (failures.length > 0) {
    console.error(
      `Update finished with ${failures.length} failure(s):\n${failures
        .map((f) => {
          const msg =
            f.error instanceof Error ? f.error.message : String(f.error);
          return `  - ${f.key} (${f.source}): ${msg}`;
        })
        .join("\n")}`
    );
    process.exit(1);
  }

  console.log("All calendars updated");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
