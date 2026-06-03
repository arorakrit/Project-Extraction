---

description: "Task list for feature 002-voice-brew-logging — Voice Brew-Logging"
---

# Tasks: Voice Brew-Logging

**Input**: Design documents from `/specs/002-voice-brew-logging/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: The spec does not explicitly request tests, but the **constitution
mandates** unit tests for the AI schema validators (≥ 90% coverage), AI golden
fixtures as the regression net for any prompt/schema change (Principle II), and
unit tests for the local-store CRUD. The pure `deriveRatio` helper is also unit
tested. UI component tests are NOT in scope for v1. Test tasks below cover exactly
that constitutional minimum.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3); omitted for Setup/Foundational/Polish phases
- Each task description includes the exact file path

## Path Conventions

Single-project Vite SPA (Option 1 per plan.md). Extends the existing `src/` tree
from 001; all new source under `src/`; all tests under `tests/`; both at repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and directories for brew logging. Nothing story-specific yet.

- [X] T001 [P] Add `@types/dom-speech-recognition@^0.0.4` as a devDependency in `package.json` (ambient Web Speech API typings; no runtime dependency added)
- [X] T002 [P] Create the new directories for this feature: `tests/unit/lib/` and `tests/ai-fixtures/brew-structuring/v60-ethiopia/` (use `.gitkeep` placeholders where empty)

**Checkpoint**: `npm install` resolves the new types package; `npm run typecheck` still exits zero.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data + shared modules every user story depends on (the brew
entity, its store, the schema, ratio derivation, telemetry, and the shared
editable fields component). No user story work can begin until this phase is done.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Bump IndexedDB to version 2 in `src/store/db.ts`: set `DB_VERSION = 2`; add a `brews` entry to the `ProjectExtractionDB` `DBSchema` interface (`key: string`, `value: BrewLogEntry`, `indexes: { by_coffee: string }`); in `upgrade()` add an `if (oldVersion < 2)` branch that creates the `brews` object store (keyPath `id`) and its `by_coffee` index on `coffee_id`; leave the `oldVersion < 1` branch (coffees, settings) untouched — forward-only per Principle IV
- [X] T004 [P] Create `src/ai/schemas/brew.ts`: `StructuredBrewSchema` (Zod) with nullable fields `brew_method`, `dose_g`, `water_g`, `ratio`, `grind`, `water_temp_c`, `total_time_s` (int), `tasting_note` per data-model.md; export `StructuredBrew` type and `isEmptyBrew(b)` (true iff every field is null → FR-008)
- [X] T005 [P] Unit test `tests/unit/ai/brew-schema.test.ts`: assert `StructuredBrewSchema` accepts a fully-populated brew, accepts an all-null brew, rejects a wrong-typed field (e.g. string `dose_g`), and that `isEmptyBrew` is true only for the all-null case; depends on T004
- [X] T006 [P] Create `src/lib/ratio.ts`: `deriveRatio(dose_g: number | null, water_g: number | null): number | null` — null if either side missing or `dose_g <= 0`; else `water_g / dose_g` rounded to 1 decimal (data-model.md)
- [X] T007 [P] Unit test `tests/unit/lib/ratio.test.ts`: 18 g / 300 g → 16.7; 15 g / 240 g → 16; null on missing dose, missing water, and zero/negative dose; depends on T006
- [X] T008 Extend `src/lib/telemetry.ts`: add `'structure_brew_note'` to the `TelemetryRecord['call']` union and add an `input_text_chars: number | null` field to the `TelemetryRecord` interface (image-less calls set `input_image_bytes: null`); update `aggregateTokens()` only if it needs the new field (it does not — leave token math unchanged)
- [X] T009 Create the brew store module `src/store/brews.ts`: define `BrewLogEntry` interface + `BrewUserEdits = Partial<StructuredBrew>` (data-model.md); implement `addBrew` (refuses `schema_version !== 1`), `getBrew` (throws `StaleBrewSchemaError` on bad version), `listBrewsForCoffee` (reads via the `by_coffee` index, sorts `logged_at` descending), `updateBrew` (exposes only `user_edits`; `structured` invariant), `deleteBrew`, `deleteBrewsForCoffee`, and the pure `effectiveBrew(entry)` merge helper (presence-checked like `effectiveExtractedCoffee`); depends on T003, T004
- [X] T010 Unit test `tests/unit/store/brews.test.ts` (via `fake-indexeddb`): round-trip `addBrew`/`getBrew`; `listBrewsForCoffee` returns only the matching coffee's brews newest-first; `updateBrew` changes `user_edits` but never `structured`; `deleteBrewsForCoffee` removes all of one coffee's brews and none of another's; `effectiveBrew` honors an explicit null edit; depends on T009
- [X] T011 Extend `deleteCoffee` in `src/store/coffees.ts` to cascade-delete the coffee's brews (FR-021): call `deleteBrewsForCoffee(id)` alongside the coffee delete so a brew never outlives its coffee; depends on T009
- [X] T012 [P] Create the shared editable fields component `src/components/BrewFields.tsx`: controlled inputs for all eight brew parameters with 44×44 touch targets, each field tappable/empty-markable ("—"), showing the derived ratio (via `deriveRatio`) read-only when dose+water present and an editable ratio input otherwise; pure presentational (value + onChange props), reused by review, manual entry, and edit; depends on T006

**Checkpoint**: `npm run typecheck`, `npm run lint`, and `npm run test` exit zero; the IndexedDB upgrade to v2 creates the `brews` store with the `by_coffee` index; foundational tests pass.

---

## Phase 3: User Story 1 - Speak a brew note → structured log entry (Priority: P1) 🎯 MVP

**Goal**: From a saved coffee's page, the user taps record, speaks a natural brew
note, and within a few seconds sees a structured, editable entry with the spoken
values in the right fields, then saves it tied to that coffee.

**Independent Test**: On a coffee page, tap record, speak a note with method/dose/
water/grind/temp/time/impression; verify the review entry shows each value in its
field within ~10 s, unstated fields are empty, ratio is derived, fields are
editable, and Save persists the entry against that coffee (verifiable via
`getBrew`). No timeline or manual fallback required for this test.

### Tests for User Story 1 (constitutional minimum) ⚠️

- [X] T013 [P] [US1] Add the golden fixture under `tests/ai-fixtures/brew-structuring/v60-ethiopia/`: `input.transcript.json` (raw spoken text, no audio), `recorded-response.json` (a captured Claude `tool_use` response for the brew), and `expected-output.json` (the post-validation `StructuredBrew`)
- [X] T014 [P] [US1] Extend `tests/unit/ai/brew-schema.test.ts` with a fixture-replay case: load `recorded-response.json`, run its tool_use input through `StructuredBrewSchema.parse(...)`, and assert deep equality with `expected-output.json` (no live Claude call); depends on T013

### Implementation for User Story 1

- [X] T015 [P] [US1] Create `src/lib/speech.ts`: `isSpeechRecognitionAvailable()` (checks `window.SpeechRecognition ?? window.webkitSpeechRecognition`) and `transcribeOnce(): Promise<string>` wrapping a single recognition session (`onresult`/`onerror`/`onend`) behind a Promise; isolates the vendor-prefixed global so it is stubbable in tests
- [X] T016 [P] [US1] Create `src/ai/prompts/brew.ts`: export `BREW_TOOL_NAME = 'record_brew_log'`, `BREW_TOOL_DESCRIPTION` (instructs null for unstated params; grams for dose/water, °C for temp, whole seconds for time), and `buildBrewPrompt(transcript)` per the contract
- [X] T017 [US1] Add `structureBrewNote(transcript: string): Promise<StructuredBrew>` to `src/ai/client.ts`: call the existing `callClaudeTool` with the `record_brew_log` tool and `StructuredBrewSchema`; pass `inputImageBytes: null` and the new `input_text_chars: transcript.length` to telemetry; throw a new `BrewEmptyError` when `isEmptyBrew(result)` (FR-008); depends on T008, T016
- [X] T018 [US1] Create `src/components/BrewReview.tsx`: render `BrewFields` over the structured brew for review/edit, capturing `user_edits`; a Save button builds a `BrewLogEntry` (`source: 'voice'`, `transcript`, fresh `crypto.randomUUID()`, `logged_at` now, `schema_version: 1`) and calls `addBrew`; depends on T009, T012
- [X] T019 [US1] Create `src/components/BrewRecorder.tsx`: one-tap record button (≥ 44×44, thumb-zone) driving `transcribeOnce()` → `structureBrewNote()`; shows distinct listening and structuring in-progress states; on success renders `BrewReview`; on `BrewEmptyError` shows "Didn't catch that — try again, or enter by hand" (FR-008); depends on T015, T017, T018
- [X] T020 [US1] Wire the entry point into `src/views/CoffeeView.tsx`: add a "Log a brew" affordance below the existing `CoffeeCard` that opens `BrewRecorder` for the current coffee; on save, dismiss the recorder; depends on T019

**Checkpoint**: User Story 1 is fully functional and testable independently — speak a note, review/edit, save, and the entry is persisted against the coffee.

---

## Phase 4: User Story 2 - Review a coffee's brew history (Priority: P2)

**Goal**: A coffee's page shows a newest-first timeline of all its brews, each
summarizing method/ratio/grind/tasting note; past entries open for editing; entries
can be deleted; everything reads offline; an empty coffee shows a first-brew prompt.

**Independent Test**: Log two+ brews against one coffee, fully close the app,
disable network, reopen, open the coffee; verify the timeline lists all brews
newest-first with key params, each opens to edit (persisted), each can be deleted,
and a brew-less coffee shows the empty state — all offline.

### Implementation for User Story 2

- [X] T021 [P] [US2] Create `src/components/BrewTimeline.tsx`: given a `coffeeId`, load via `listBrewsForCoffee`, render rows newest-first each showing method, derived/effective ratio, grind, and tasting note (≥ 44×44 tap targets); render a clear empty state with a one-tap "log your first brew" action when there are none (FR-016); depends on T009
- [X] T022 [US2] Mount `BrewTimeline` in `src/views/CoffeeView.tsx` below the card/record entry point; refresh the list after a brew is saved in US1 so a new entry appears at the top; depends on T020, T021
- [X] T023 [US2] Add brew editing: tapping a timeline row opens `BrewFields` over that entry's `effectiveBrew`, and saving calls `updateBrew(id, { user_edits })` and updates the row in place (FR-014); depends on T021, T012
- [X] T024 [US2] Add brew deletion: a delete control on the entry calls `deleteBrew(id)` and removes it from the timeline without reappearing on reload (FR-015); depends on T021

**Checkpoint**: User Stories 1 and 2 both work independently — capture brews and review/edit/delete the full offline history.

---

## Phase 5: User Story 3 - Manual fallback when voice isn't an option (Priority: P3)

**Goal**: When speech recognition is unavailable, when the user prefers typing, or
when structuring fails, the user reaches a manual brew-entry form producing an
equivalent entry — and a spoken note is never lost.

**Independent Test**: On a session where speech is unavailable (or by choosing
"enter by hand"), fill the fields manually and save; verify the entry is identical
in kind to a voice one and appears in the timeline. With voice available but
network off, record a note and verify you land in the manual form pre-filled with
the transcript (no loss).

### Implementation for User Story 3

- [X] T025 [P] [US3] Create `src/components/BrewEntryForm.tsx`: wraps `BrewFields` for a brand-new manual entry, building a `BrewLogEntry` (`source: 'manual'`, `transcript: null`, ratio derived identically) and calling `addBrew` (FR-019); accepts an optional initial `tasting_note` for the pre-fill case; depends on T009, T012
- [X] T026 [US3] Auto-route to manual when speech is unavailable: in the `BrewRecorder`/entry point, when `isSpeechRecognitionAvailable()` is false, present `BrewEntryForm` directly instead of the record button (FR-017); depends on T019, T025
- [X] T027 [US3] Add an explicit "enter by hand" option alongside the record button when speech IS available, opening `BrewEntryForm` (FR-018); depends on T019, T025
- [X] T028 [US3] No-loss failure fallback: in `BrewRecorder`, catch `ClaudeNetworkError`/`ClaudeSchemaError` from `structureBrewNote` and open `BrewEntryForm` pre-filled with the raw transcript as the tasting note (Principle IV — no data loss; contract failure-mode UX); depends on T019, T025

**Checkpoint**: All three user stories are independently functional; every path to logging a brew reaches a usable form and no spoken note is discarded on failure.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Constitution-mandated verification and final gates across all stories.

- [X] T029 [P] Run the constitution's mandatory mobile-first verification per Principle III: open a coffee at 393 px (iPhone 14 Pro) and 430 px (iPhone Pro Max); verify the record button, every editable field, Save, each timeline row, edit, and delete are reachable in one thumb-zone tap with ≥ 44×44 targets and no hover/right-click paths; capture screenshots; attach to the eventual PR description
- [X] T030 [P] Execute the quickstart.md verification end-to-end: Story 1 (speak → structured entry), Story 2 (timeline → edit/delete offline), Story 3 (unavailable-speech, enter-by-hand, and offline no-loss pre-fill). Run structuring across **at least 5 naturally spoken brew notes** (different methods/phrasings) and tally the SC-002 field-placement accuracy, the SC-004 edit-count distribution, the SC-001 timing (stop-speaking → entry ≤ 10 s), and SC-008 (ratio matches stated dose/water); note results in the PR description
- [X] T031 Final typecheck + lint + test pass: `npm run typecheck && npm run lint && npm run test` exit zero
- [X] T032 Confirm constitution gates G1–G6 still hold against the implemented code (re-read `plan.md`'s Constitution Check); verify exactly **1 Claude call per brew log**, all brew reads work offline, and no raw transcript/audio appears in telemetry; if any gate now fails, file a tasks-template-style task for the fix BEFORE merging

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Stories (Phase 3–5)**: All depend on Foundational completion.
  - US1 (P1) is the MVP and should land first.
  - US2 (P2) builds the timeline UI; it mounts in the same `CoffeeView` US1 touched, so it follows US1 in practice.
  - US3 (P3) enhances the US1 recorder/entry point (fallback routes); it follows US1.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Needs only Foundational. Fully independent.
- **US2 (P2)**: Needs Foundational; integrates with `CoffeeView` from US1 (T022 depends on T020) but the timeline itself (T021) is independently testable against the store.
- **US3 (P3)**: Needs Foundational; the manual form (T025) is independent, while the routing/fallback tasks (T026–T028) enhance the US1 recorder.

### Within Each User Story

- Tests (where included) before the implementation they cover.
- Schema/store/helpers before components; components before view wiring.
- Story complete before moving to the next priority.

### Parallel Opportunities

- Setup: T001 and T002 in parallel.
- Foundational: T004, T006, T012 in parallel (different files); their tests (T005, T007) follow each. T003 (db) and T008 (telemetry) are independent edits. T009 depends on T003+T004; T010/T011 follow T009.
- US1: T013 and T015/T016 can proceed in parallel; T014 follows T013; T017 follows T016; T018 follows T012/T009; T019 follows T015+T017+T018.
- US2: T021 is parallelizable against US3's T025 (different files).
- Polish: T029 and T030 in parallel.

---

## Parallel Example: Foundational Phase

```bash
# Independent module creations (different files):
Task: "Create src/ai/schemas/brew.ts (StructuredBrewSchema + isEmptyBrew)"
Task: "Create src/lib/ratio.ts (deriveRatio)"
Task: "Create src/components/BrewFields.tsx (shared editable fields)"

# Their unit tests follow each module:
Task: "Unit test tests/unit/ai/brew-schema.test.ts"
Task: "Unit test tests/unit/lib/ratio.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: speak a note → review → save → confirm persisted.
5. Demo if ready — this is the hero moment.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → test independently → demo (MVP: voice → structured entry).
3. US2 → test independently → demo (offline brew history + edit/delete).
4. US3 → test independently → demo (manual fallback + no-loss).
5. Each story adds value without breaking the previous.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks.
- [Story] label maps each task to a user story for traceability.
- Exactly **1 Claude call per brew log** (`structure_brew_note`) — under the
  Principle V ≥ 3-call threshold; no Complexity Tracking entry.
- The IndexedDB migration is forward-only additive (v1 coffees untouched).
- Never log raw transcripts/audio — telemetry records `input_text_chars` only.
- Commit after each task or logical group; stop at any checkpoint to validate.
