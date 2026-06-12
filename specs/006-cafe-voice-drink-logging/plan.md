# Implementation Plan: Café-First Drink Logging with Voice Capture

**Branch**: `006-cafe-voice-drink-logging` | **Date**: 2026-06-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-cafe-voice-drink-logging/spec.md`

## Summary

Re-orient the existing drink-logging flow (003) around the café, and add voice
capture. The `#/log` form leads with the **venue field** (type-ahead retained);
the bean-detail fields (coffee name, origin, process, roast) collapse behind a
single "Add drink details" expander, hidden by default. Drink history headlines
the café on every card and gains a venue-filtered view (`#/drinks/at/<venue>`,
plus a labelled "No café" bucket) reachable in one tap from any entry.

Voice: a thumb-zone mic button on the logging screen starts a Web Speech API
session (reusing `src/lib/speech.ts` from 002 unchanged). The transcript goes to
Claude `claude-sonnet-4-6` via **one tool-use call** — `structure_drink_note`,
tool `record_drink_log` — whose input schema is derived from a new Zod object
(`VoiceDrinkDraftSchema` in `src/ai/schemas/drink.ts`) that also validates the
response at runtime (Principle II, single source of truth). The validated draft
(venue, drink name, rating, palette flavour tags) **prefills the same café-first
form** for review; Save is the explicit confirmation and routes through the
existing `makeDrinkLog` → `addDrink` path. No DB schema change, no `DrinkLog`
shape change, no migration — `DB_VERSION` stays 3. Exactly **1 Claude call per
voice log**; manual logging remains fully offline.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict), React 18.3, ECMAScript 2022 —
unchanged from 001–005.

**Primary Dependencies**: No new dependencies. Everything required already
ships: `react`, `vite`, `zod`, `zod-to-json-schema`, `idb`,
`@types/dom-speech-recognition` (dev, from 002), `vitest`,
`@testing-library/react`, `fake-indexeddb` (test).

**Storage**: IndexedDB `project-extraction`, **version 3 — unchanged**. The
`drinks` store and the `DrinkLog` record shape (`schema_version: 1`) are not
modified. Venue filtering is an in-memory, case-insensitive filter over
`listDrinks()` (same approach as the existing `listVenues()` dedupe); no new
index. FR-008 (pre-existing logs intact) is satisfied by construction.

**Testing**:
  - Vitest unit tests for `VoiceDrinkDraftSchema` validation + the deterministic
    draft-normalization helper (dedupe tags, cap at 3, clamp rating).
  - Unit tests for `listDrinksByVenue()` (case-insensitive match, null-venue
    bucket) via `fake-indexeddb`.
  - One AI golden fixture under `tests/ai-fixtures/drink-structuring/` —
    recorded `record_drink_log` tool_use response replayed through the Zod
    validator (no live Claude call in tests), per Principle II.
  - Component test: café-first field order + collapsed details expander.

**Target Platform**: Modern mobile browsers — Chrome on Android (full Web
Speech support), iOS Safari 17+ (partial/unreliable Web Speech; manual
café-first form is the guaranteed path). Progressive enhancement to desktop.

**Project Type**: Single-page web application (Vite SPA). No backend —
unchanged.

**Performance Goals**:
  - Voice draft visible for review **≤ 10 s** after the user stops speaking on
    4G (supports SC-001's 20 s end-to-end).
  - Manual rating-only log unchanged at < 30 s with two mandatory interactions
    (SC-004 — regression guard).
  - History and venue-filtered views render **≤ 200 ms** offline from
    IndexedDB.
  - No bundle-size regression beyond the new schema/prompt/components (~ a few
    KB; no new runtime deps).

**Constraints**:
  - All history reads (including the venue view) MUST work offline
    (Principle IV).
  - Voice capture + structuring require network; offline or unavailable speech
    degrades to the manual café-first form with a clear reason (FR-014).
  - A failed structuring call MUST keep the transcript visible in the error
    state so nothing the user said is lost while they retry or fill manually
    (Principle IV; 002 precedent).
  - **Exactly 1 Claude call per voice-logged drink** — under the ≥ 3 threshold.
  - All AI output MUST pass Zod validation before the draft is rendered or
    persisted (Principle II); persistence additionally re-validates via the
    existing `makeDrinkLog` invariants.

**Scale/Scope**: Single-user, single-device; hundreds of drink logs at most —
in-memory venue filtering is comfortably sufficient. Adds 1 Claude call type,
0 stores, ~2 new components, 1 new route pattern, and modifies the drink form,
card, history view, and router.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **G1. Spec lineage (Principle I)** — **PASS**. `spec.md` authored via
  `/speckit-specify` on this branch; quality checklist passed 16/16 with zero
  `[NEEDS CLARIFICATION]` markers (two interpretation calls recorded as
  Assumptions, revisable via `/speckit-clarify`). This plan references it.
- **G2. AI schema-first (Principle II)** — **PASS**. Exactly one new Claude
  call, `structure_drink_note` (tool `record_drink_log`), via the existing
  `callClaudeTool` wrapper. Its `input_schema` is derived at module load from
  the same Zod object (`VoiceDrinkDraftSchema`, `src/ai/schemas/drink.ts`) that
  validates the response — no parallel shapes. Flavour tags are a closed enum
  reusing `FLAVOUR_TAGS`; unmentioned fields are `null`, never fabricated.
  Golden fixture lands in `tests/ai-fixtures/drink-structuring/`.
- **G3. Mobile-first UX (Principle III)** — **PASS**. Mic button is a ≥ 44×44
  thumb-zone target on `#/log`, one tap from the FAB; venue field first at
  ≤ 430 px; expander, cards, and venue tap-throughs are touch-first with no
  hover/right-click paths. Mobile-viewport verification evidence goes in the PR.
- **G4. Local-first persistence (Principle IV)** — **PASS**. No store or
  migration changes; all writes go through the existing `makeDrinkLog` →
  `addDrink` path; history and venue views read offline. Voice transcript is
  retained on-screen through structuring failure (retry or manual fill — no
  data loss), matching the 002 precedent.
- **G5. Observability & cost (Principle V)** — **PASS**. The structuring call
  flows through `callClaudeTool`, emitting the standard `TelemetryRecord`
  (model id, latency, output tokens, status, retry, `input_text_chars`; no raw
  audio/transcript logged). `'structure_drink_note'` joins the telemetry `call`
  union. **1 call per user action** — no Complexity Tracking entry required.
  Failure surfaces the retryable "didn't catch that" message — no silent
  failure.
- **G6. Technology constraints** — **PASS**. React + TypeScript + Claude
  `claude-sonnet-4-6` + Web Speech API + IndexedDB — all within the
  constitution. Speech is feature-detected with a clear non-blocking notice and
  the manual form as the always-available path (constitution Section 2
  requirement, already implemented in `src/lib/speech.ts`).

**Existing-code touchpoints** (called out so they surface as explicit
`/speckit-tasks` items, not silent edits):

1. `src/lib/telemetry.ts` — add `'structure_drink_note'` to the `call` union.
2. `src/ai/client.ts` — add `'record_drink_log'` to `ClaudeToolName`; add
   `structureDrinkNote(transcript)` + `DrinkDraftEmptyError` (all-null draft →
   "didn't catch that", mirroring `BrewEmptyError`).
3. `src/store/drinks.ts` — add `listDrinksByVenue(venue: string | null)`
   (case-insensitive trim match; `null` = the No-café bucket) and
   `resolveVenueCasing(spoken: string)` against `listVenues()` (FR-015).
4. `src/components/DrinkLogForm.tsx` — venue field first; rating second;
   flavour third; name/origin/process/roast inside a collapsed "Add drink
   details" expander (FR-001/002); accept optional initial draft values so the
   same form is the voice-review surface (FR-012).
5. `src/components/DrinkCard.tsx` — café name becomes the headline; rating,
   drink name, tags secondary (FR-005); café tap-through to the venue view.
6. `src/views/DrinkLogView.tsx` — mount the mic entry point + capture states
   (idle → listening → structuring → review/error).
7. `src/views/DrinksView.tsx` — venue-filtered mode + "No café" labelled
   grouping (FR-006/007).
8. `src/App.tsx` — route `#/drinks/at/<encoded-venue>` and `#/drinks/no-cafe`.

## Project Structure

### Documentation (this feature)

```text
specs/006-cafe-voice-drink-logging/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (already authored)
├── research.md          # Phase 0 output (this command)
├── data-model.md        # Phase 1 output (this command)
├── quickstart.md        # Phase 1 output (this command)
├── contracts/           # Phase 1 output (this command)
│   ├── drink-structuring.contract.md
│   └── cafe-browse-ui.contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── ai/
│   ├── schemas/
│   │   └── drink.ts               # NEW: VoiceDrinkDraftSchema (Zod) + VoiceDrinkDraft type
│   │                              #      + normalizeDrinkDraft() + isEmptyDrinkDraft()
│   ├── prompts/
│   │   └── drink.ts               # NEW: tool name/description + buildDrinkPrompt(transcript)
│   └── client.ts                  # MODIFIED: + structureDrinkNote(), DrinkDraftEmptyError,
│                                  #            'record_drink_log' in ClaudeToolName
├── store/
│   └── drinks.ts                  # MODIFIED: + listDrinksByVenue(), resolveVenueCasing()
├── lib/
│   ├── speech.ts                  # UNCHANGED: reused as-is (002)
│   └── telemetry.ts               # MODIFIED: + 'structure_drink_note' call
├── components/
│   ├── DrinkRecorder.tsx          # NEW: mic button + listening/structuring/error states
│   │                              #      (transcript preserved through failure)
│   ├── DrinkLogForm.tsx           # MODIFIED: café-first order, collapsed details expander,
│   │                              #            optional initial draft (voice review)
│   └── DrinkCard.tsx              # MODIFIED: venue headline + café tap-through
├── views/
│   ├── DrinkLogView.tsx           # MODIFIED: mount DrinkRecorder; draft → form prefill
│   └── DrinksView.tsx             # MODIFIED: venue-filter mode + "No café" grouping
└── App.tsx                        # MODIFIED: routes #/drinks/at/<venue>, #/drinks/no-cafe

tests/
├── unit/
│   ├── ai/
│   │   └── drink-schema.test.ts   # NEW: schema validation, normalizeDrinkDraft (dedupe/cap/
│   │                              #      clamp), isEmptyDrinkDraft, fixture replay
│   ├── store/
│   │   └── drinks-by-venue.test.ts# NEW: listDrinksByVenue + resolveVenueCasing
│   └── components/
│       └── drink-log-form.test.tsx# NEW: field order, collapsed expander, draft prefill
└── ai-fixtures/
    └── drink-structuring/
        └── flat-white-four-stars/
            ├── input.transcript.json     # raw spoken text (no audio bytes)
            ├── recorded-response.json    # captured Claude tool_use response
            └── expected-output.json      # post-validation + normalization draft
```

**Structure Decision**: Single project — extends the established Vite SPA
`src/` layout (`ai/ · store/ · lib/ · components/ · views/`) by capability,
exactly as 002 and 003 did. Reuses the 001 Claude wrapper + retry + telemetry,
the 002 speech wrapper, and the 003 drinks store and form components. No new
top-level structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. One Claude call per voice-logged drink (`structure_drink_note`)
is well under Principle V's ≥ 3 threshold; manual logs make zero calls.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _none_    |            |                                     |
