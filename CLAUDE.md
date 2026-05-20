# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

This project uses **pnpm** (pinned via `packageManager: "pnpm@10.33.0"` in `package.json`). CI uses `pnpm/action-setup@v4`; locally pnpm is auto-provisioned by corepack-aware Node setups (mise, asdf, fnm with corepack) or installed manually.

- `pnpm install` — install deps (use `--frozen-lockfile` in CI).
- `pnpm run build` — compile TypeScript to `dist/` (sources outside `scripts/` are also compiled because `rootDir` is `.`).
- `pnpm run update-calendar` — sync every calendar in the registry. Loads `.env` if present (`node --env-file-if-exists`), then `dist/scripts/update-calendar.js`.
- `pnpm run reset-calendar` — destructive reset for a single calendar; requires `CALENDAR_KEY` (e.g. `ceara`, `world-cup-2026`). Loads `.env` if present.
- `pnpm run clean` — remove `dist/`.
- No test suite is configured (`pnpm test` is a stub).

Local dev: copy `.env.example` to `.env`, fill in the real values, then `pnpm run build && pnpm run update-calendar`. `.env` is gitignored.

## Runtime configuration

Each calendar in the registry owns its own Google credentials — different calendars can be backed by different service accounts. Credentials are resolved lazily by `resolveCalendar(config)` so a missing or malformed one only fails the calendar that needs it.

Per-calendar env vars (the names are declared in each `CalendarConfig.env` block):

- `<KEY>_CALENDAR_ID` — Google Calendar ID to write to. Required.
- `<KEY>_GOOGLE_KEYS_JSON` — full service account JSON, compact single line. Required. Parsed inline; `client_email` / `private_key` are pulled out for the JWT.
- `<KEY>_GOOGLE_SERVICE_ACCOUNT` — optional JWT `subject` for domain-wide delegation. Leave blank if the calendar is shared directly with the service account.

Shared env vars:

- `API_FOOTBALL_ENDPOINT` — RapidAPI host (typically `v3.football.api-sports.io`).
- `API_FOOTBALL_KEY` — RapidAPI key.
- `CALENDAR_KEY` — only consumed by `reset-calendar`; picks which registry entry to reset.

Current per-calendar names:

- `CEARA_CALENDAR_ID`, `CEARA_GOOGLE_KEYS_JSON`, `CEARA_GOOGLE_SERVICE_ACCOUNT`.
- `WORLD_CUP_2026_CALENDAR_ID`, `WORLD_CUP_2026_GOOGLE_KEYS_JSON`, `WORLD_CUP_2026_GOOGLE_SERVICE_ACCOUNT`.

In GitHub Actions every value comes from a repo secret of the same name. The reset workflow passes its `calendar` dispatch input through as `CALENDAR_KEY`. Locally, copy `.env.example` to `.env` (gitignored) and fill it in; `node --env-file-if-exists=.env` loads it automatically. That flag requires Node ≥ 22.7 — both workflows pin `node-version: 22`.

Rotating one calendar's SA key only touches that calendar's secret — no shared blob to re-paste.

## Architecture

This is a TypeScript app that mirrors football fixtures into Google Calendars. It runs as two GitHub Actions workflows in `.github/workflows/`:

- `update-calendar.yml` — `schedule: '30 * * * *'` (hourly at :30) plus `workflow_dispatch`. Runs `scripts/update-calendar.ts`, which iterates every entry in the calendar registry and upserts fixtures. Per-calendar failures are collected and logged; the job exits 1 if any failed, but one bad calendar does not skip the others.
- `reset-calendar.yml` — `workflow_dispatch` only, with two inputs: `calendar` (choice between registered keys) and `confirm` (must equal the literal string `reset`). Deletes every event in the chosen calendar and re-creates from the current season's fixtures.

Both workflows share `concurrency.group: ceara-calendar` so a destructive reset cannot race with a scheduled update — and the two calendars share the same group, so resets serialize against each other too.

### Calendar registry

`shared/calendars.ts` is the single source of truth for what gets synced. Each `CalendarConfig` has:

- `key` — stable identifier used as the reset workflow's `calendar` input and `CALENDAR_KEY` env var.
- `env` — names of the three env vars to read (`calendarId`, `keysJson`, optional `serviceAccount`). `resolveCalendar(config)` reads and validates them, returning a typed `ResolvedCalendar` containing parsed keys. The Google service is then constructed via `GoogleCalenderService.create({ calendarId, keys, serviceAccount })` — no env reads inside the service itself.
- `source` — discriminated union driving the fetch strategy:
  - `{ kind: 'team', teamId }` — rolling window: queries the API for `currentYear` and `nextYear`, with `from = today-1month` for the current year and the full year range for the next. Existing-events comparison window spans both years.
  - `{ kind: 'league', leagueId, season }` — fixed season: single `/fixtures?league=X&season=Y` call. Existing-events comparison window is the entire `season` year.

Adding a new competition:

1. Add a `CalendarConfig` entry; pick env var names following the `<KEY>_CALENDAR_ID` / `<KEY>_GOOGLE_KEYS_JSON` / `<KEY>_GOOGLE_SERVICE_ACCOUNT` pattern.
2. Add a block to `.env.example` and `.env`.
3. Add the three new secrets to GitHub repo settings and reference them in **both** workflows' `env:` blocks (each workflow passes the full set of every calendar's secrets — the script only blows up when a specific calendar tries to run without its env vars).
4. Add the new `key` to the reset workflow's `calendar` `choice` input.

Current entries:

- `ceara` → reads `CEARA_*`, by team `129`.
- `world-cup-2026` → reads `WORLD_CUP_2026_*`, by league `1` season `2026`. Tournament runs 2026-06-11 → 2026-07-19.

### Service composition

```
scripts/{update,reset}-calendar.ts
  └── CalendarConfig from shared/calendars.ts
        └── MatchToCalendarService (services/match-to-calendar)
              ├── ICalendarProvider  ← GoogleCalenderService(calendarId) (services/calendar-provider)
              └── IMatchProvider     ← ApiFootballDotComService (services/match-provider)
```

`MatchToCalendarService.updateCalendar(config)` and `resetCalendar(config)` dispatch on `config.source.kind`. The Google service takes the calendar ID at construction (`GoogleCalenderService.create(calendarId)`) — no more hidden coupling to a single calendar.

### Load-bearing details

- **Event identity**: the fixture ID from API-Football is reused as the Google Calendar event ID (`Event.create` → `event.fixture.id.toString()`). Upserts rely on this — existing events are fetched in the window, then each generated event is matched by `id` to decide insert vs. update. Do not synthesize a different ID scheme.
- **Date handling in `Event.entity`**: matches with status `TBD` or in `StatusExceptions` (postponed, suspended, cancelled, etc.) become all-day events (`date`-only). Otherwise they're timed events in UTC with a hard-coded 2-hour duration (`convertDate(..., offset=2)`). Status drives both the date format and the `summary`/`description` strings (Portuguese labels in `MatchEnum.StatusLabels`).
- **Google auth**: each calendar has its own `google.auth.JWT`. Credentials come from the calendar's own `<KEY>_GOOGLE_KEYS_JSON` env var, scope `https://www.googleapis.com/auth/calendar`. `subject` is the calendar's own `<KEY>_GOOGLE_SERVICE_ACCOUNT` (only set if you use domain-wide delegation). Otherwise the calendar must be directly shared with the service account email ("Make changes to events"). Different calendars can use entirely separate service accounts from different GCP projects.
- **Error handling**: scripts catch at the top level and `process.exit(1)` on failure so the workflow run shows as failed in GitHub.

## TypeScript notes

- `tsconfig.json` has `strict: false`, no `esModuleInterop`, and targets ES6/CommonJS. Existing code uses non-null assertions and loose typing — match the surrounding style rather than tightening one file in isolation.
- `dayjs` is imported as `import dayjs = require("dayjs")` everywhere because the default-import form needs `esModuleInterop`, which is intentionally off. Use the same form for any new CommonJS-only dep.
