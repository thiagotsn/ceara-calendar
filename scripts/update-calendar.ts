import { GoogleCalenderService } from "../services/calendar-provider/google-calendar.service";
import { ApiFootballDotComService } from "../services/match-provider/api-football-dot-com.service";
import { MatchToCalendarService } from "../services/match-to-calendar/match-to-calendar.service";
import {
  CALENDARS,
  CalendarConfig,
  resolveCalendar,
} from "../shared/calendars";

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
  const failures: { key: string; error: unknown }[] = [];

  for (const config of CALENDARS) {
    console.log(`[${config.key}] updating...`);
    try {
      await updateOne(config);
      console.log(`[${config.key}] done`);
    } catch (error) {
      console.error(`[${config.key}] failed`, error);
      failures.push({ key: config.key, error });
    }
  }

  if (failures.length > 0) {
    console.error(
      `Update finished with ${failures.length} failure(s): ${failures
        .map((f) => f.key)
        .join(", ")}`
    );
    process.exit(1);
  }

  console.log("All calendars updated");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
