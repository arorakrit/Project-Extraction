# Quickstart: Scan Bag to Coffee Card

**Feature**: 001-scan-bag-to-card
**Audience**: a developer (or future-you) opening the repo for the first time
and wanting to verify Story 1 (capture → card) works end-to-end on a real
device.

---

## Prerequisites

- Node.js 20+ and `npm` 10+.
- An Anthropic API key with access to `claude-sonnet-4-6`.
- A modern mobile browser (iOS Safari 17+ or Chrome Android 13+) on a
  phone reachable from your dev machine — OR a desktop browser at a
  ≤ 430 px-wide window (Chrome DevTools mobile emulation works).
- A specialty coffee bag in hand, or a clear photo of one in your gallery
  (sample images are checked into `Samples_Coffee/`).

---

## First-time setup

```powershell
# From repo root
npm install
npm run dev
```

`npm run dev` starts Vite. The console will print a `Local:` URL
(`http://localhost:5173`) and a `Network:` URL (your LAN IP) — open the
Network URL on your phone (both devices must be on the same network).

On first launch, the app routes you to **Settings** because no API key is
stored. Paste your Anthropic key; tap **Save**. The key is written to the
`settings` IndexedDB store on this device only and is not transmitted
anywhere except directly to `api.anthropic.com` on each Claude call.

---

## Verify User Story 1 — capture → card (MVP)

1. Tap **Scan**.
2. Tap the capture button. The OS file picker appears.
   - On mobile: choose "Take Photo" or pick from gallery.
   - On desktop: select an image from `Samples_Coffee/` (or
     `20260421_152356868_iOS.jpg` / `20260421_152522437_iOS.jpg` in the
     repo root).
3. Wait for the in-progress indicator. Within ~10 seconds on a 4G/5G or
   Wi-Fi connection you should see a populated coffee card.
4. Confirm:
   - The card shows roaster, coffee name, origin, variety, process, roast
     level, and tasting notes — populated where they appeared on the label,
     and visually marked empty where they didn't.
   - Tapping any field lets you edit it.
   - **Open DevTools → Console**: you should see one telemetry log line
     for `extract_coffee_label` with `status: ok` (or `retry_then_ok`),
     `latency_ms`, and `output_tokens`.

This is the SC-001 / SC-002 / SC-003 confidence loop.

---

## Verify User Story 2 — save and revisit

1. From the review card after capture, tap **Save**.
2. The app navigates to the coffee's permanent page.
3. Tap **Library** (or your equivalent navigation). The saved coffee
   appears in the list.
4. Close the browser tab (or, on phone, swipe-close the browser app).
5. **Turn off Wi-Fi / put the phone in airplane mode.**
6. Reopen the app from the URL. The library list should render
   immediately and the saved coffee's detail page should open with the
   full card.
7. This validates FR-009 through FR-012 and SC-005.

---

## Verify User Story 3 — enrichment

1. With network restored, save a coffee whose origin is well-known (e.g.,
   any single-estate Ethiopian or Colombian bag).
2. Within a few seconds after the save navigation, the coffee detail page
   should populate additional sections: origin story, producer context,
   and a brew recommendation.
3. Re-open the same coffee while offline: the enrichment sections should
   still display (they were persisted in the same IndexedDB record).
4. DevTools console: a second telemetry line for `enrich_coffee_profile`
   with `status: ok`.

---

## Run the test suite

```powershell
npm run test          # Vitest: unit + component tests + AI fixture replay
npm run typecheck     # tsc --noEmit
npm run lint          # ESLint
```

What each catches:
- `tests/unit/ai/extraction-schema.test.ts` and
  `tests/unit/ai/enrichment-schema.test.ts` replay every fixture under
  `tests/ai-fixtures/{extraction,enrichment}/` through the live Zod
  schemas. If a fixture's `recorded-response.json` doesn't pass the
  schema, or the parsed output doesn't equal `expected-output.json`,
  the test fails. This is the regression net for any prompt or schema
  change (constitution Principle II).
- `tests/unit/store/coffees.test.ts` uses `fake-indexeddb` to run CRUD
  against a real IndexedDB shape — no mocks of our own code.
- `tests/unit/ai/client.test.ts` exercises the retry-once-on-schema-error
  policy with mocked `fetch`.

---

## Sanity-check mobile-first UX

Per constitution Principle III, every PR that touches UI MUST be checked
at a mobile viewport. To self-check:

1. Chrome DevTools → toolbar device button → choose iPhone 14 Pro (393 px).
2. Hover-check: nothing in the app should require hover or right-click.
3. Tap-target check: the Scan button, every field tappable on the card,
   the Save and Library nav controls — each should be ≥ 44 × 44 CSS px.

If you're shipping to a PR, include a mobile-viewport screenshot in the PR
description as per the constitution's quality gates.

---

## Troubleshooting

**"Couldn't read the label" on every photo**
- API key issue (often): open Settings, confirm the key looks right (no
  leading/trailing whitespace). Re-save.
- Photo issue: try a brighter shot, fill the frame with the label, hold
  the bag flat.
- DevTools network tab: look for a 4xx response from `api.anthropic.com`
  — `401` means the key is wrong; `400` typically means the model
  rejected the request shape (file a bug with the response body, image
  redacted).

**Saved coffees disappear after closing the browser**
- You probably cleared site data, or you're in a Private/Incognito tab
  that wipes IndexedDB on close. Use a normal window.

**The dev HUD shows token counts climbing fast**
- Expected: every extraction is ~1.5K input + ~200 output tokens; every
  enrichment is ~500 input + ~500 output. Two calls per coffee. If you
  see ≥ 3 calls per "add a coffee" interaction, that's a violation of
  Principle V's threshold for this feature — file a bug.

---

## What's NOT in this quickstart

- **Voice brew logging** — a separate feature, separate spec.
- **PWA install / offline-first app shell** — planned for a follow-up.
- **localStorage → IndexedDB migration** — there isn't one. The starter's
  `localStorage["grind_coffees"]` data is not preserved; any dev with
  prior data should re-scan from the source images.
- **Production deployment** — out of scope; this feature only targets
  local development verification of the spec.
