# Quickstart: Café-First Drink Logging with Voice Capture

**Feature**: `006-cafe-voice-drink-logging` | **Date**: 2026-06-12

## Prerequisites

- Node 20+, npm. Repo cloned, on branch `006-cafe-voice-drink-logging`.
- An Anthropic API key — either a personal key in Settings (BYOK) or a
  build-time `VITE_ANTHROPIC_KEY` in an untracked `.env` (see 005). Voice
  structuring needs a key; the manual form does not.
- A browser with Web Speech support for the voice path (Chrome on Android or
  desktop Chrome). iOS Safari is the degraded-path test bed.

## Run

```powershell
npm install
npm run dev        # Vite dev server
```

Open the printed URL **in a mobile viewport** (DevTools device toolbar,
≤ 430 px) — constitution Principle III says mobile first.

## Verify: café-first form (US1)

1. Tap the `+` FAB (or navigate to `#/log`).
2. Confirm the **venue field is first** and most prominent; rating below it;
   flavour tags below that.
3. Confirm coffee name / origin / process / roast are **hidden** behind a
   collapsed "Add drink details" expander; expanding shows all four.
4. Save with only a rating → still succeeds (rating remains the only required
   field).
5. Save with a venue → history card headlines the café.

## Verify: voice logging (US2)

1. On `#/log`, tap the mic button and say:
   *"oat flat white at Sunday's Coffee, four stars, fruity and bright"*.
2. Tap stop. Within ~10 s the form prefills: venue "Sunday's Coffee", coffee
   "oat flat white", rating 4, tags Fruity + Bright.
3. Edit any field, then Save — entry appears in history with edited values.
4. Speak something with **no rating** → Save stays disabled until you set one.
5. Dismiss a draft without saving → nothing appears in history.
6. Say more than three palette flavours → at most three are selected.
7. Go offline (DevTools → Network → Offline), try voice → clear retryable
   error, transcript still visible, manual form still works.

## Verify: café browsing (US3)

1. Log two drinks at the same café and one with no venue.
2. Open `#/drinks` — each card headlines its café; the venue-less one shows
   "No café".
3. Tap a café name → `#/drinks/at/<venue>` lists exactly that café's drinks,
   newest first. Tap "No café" → `#/drinks/no-cafe` lists the venue-less entry.
4. Reload while offline — history and venue views still render.

## Tests & gates

```powershell
npm run test       # vitest: schema + normalization, store venue filter, form order,
                   #         golden-fixture replay (no live Claude call)
npx tsc --noEmit   # type gate
npm run lint       # lint gate
```

Golden fixture: `tests/ai-fixtures/drink-structuring/flat-white-four-stars/`.
To re-record after a prompt/schema change: make one real voice log with
DevTools open, copy the `tool_use` block from the network response into
`recorded-response.json`, and update `expected-output.json` (constitution
Principle II gate — fixture must accompany any prompt/schema change).

## Notes

- `DB_VERSION` stays 3 — no migration; existing drinks must all still render.
- Telemetry: `window.__telemetry.session()` in the console shows the
  `structure_drink_note` records (latency, tokens, status). Exactly one record
  per voice attempt; zero for manual logs.
