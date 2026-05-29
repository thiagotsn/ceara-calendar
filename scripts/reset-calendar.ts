import { GoogleCalenderService } from "../services/calendar-provider/google-calendar.service";
import { createMatchProvider } from "../services/match-provider/factory";
import { MatchToCalendarService } from "../services/match-to-calendar/match-to-calendar.service";
import { CALENDARS, findCalendar, resolveCalendar } from "../shared/calendars";

async function main(): Promise<void> {
  const key = process.env["CALENDAR_KEY"];
  if (!key) {
    throw new Error(
      `CALENDAR_KEY env var is required. Known calendars: ${CALENDARS.map(
        (c) => c.key
      ).join(", ")}`
    );
  }

  const config = findCalendar(key);
  if (!config) {
    throw new Error(
      `Unknown calendar "${key}". Known: ${CALENDARS.map((c) => c.key).join(", ")}`
    );
  }

  const resolved = resolveCalendar(config);
  const calendarProvider = await GoogleCalenderService.create({
    calendarId: resolved.calendarId,
    keys: resolved.keys,
    serviceAccount: resolved.serviceAccount,
  });
  const matchProvider = createMatchProvider(config.source);
  const service = new MatchToCalendarService(calendarProvider, matchProvider);

  await service.resetCalendar(config);
  console.log(`[${config.key}] reset completed`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
