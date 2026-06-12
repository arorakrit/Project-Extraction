# Tasks: Café-First Drink Logging with Voice Capture

**Input**: Design documents from `/specs/006-cafe-voice-drink-logging/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: INCLUDED — the constitution mandates unit tests for deterministic logic
(schema validators, store reducers) and a golden fixture for every new/changed
Claude call (Principle II quality gate). Test tasks below are constitutional, not
optional.

**Organization**: Tasks are grouped by user story so each story is an
independently implementable, testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 (café-first form), US2 (voice logging), US3 (browse by café)

## Path Conventions

Single project (Vite SPA): `src/`, `tests/` at repository root, per plan.md.

---

## Phase 1: Setup

**Purpose**: Confirm a green baseline before touching code — no new dependencies,
no scaffolding needed (everything required already ships per plan.md).

- [X] T001 Verify clean baseline on branch `006-cafe-voice-drink-logging`: `npm run test`, `npx tsc --noEmit`, and `npm run lint` all pass before any 006 change lands

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared store-layer read helpers in `src/store/drinks.ts` — one file
touched by both US2 (venue-casing resolution) and US3 (venue filtering). Landing
both together avoids cross-story edit conflicts and unblocks parallel story work.

**⚠️ CRITICAL**: US2 and US3 both depend on this phase. (US1 technically does
not, but the phase is small.)

- [X] T002 Add `listDrinksByVenue(venue: string | null)` (case-insensitive trim match; `null` returns the no-venue bucket, newest first) and `resolveVenueCasing(spoken: string)` (case-insensitive match against `listVenues()` → stored casing, else verbatim) to `src/store/drinks.ts` — read-only helpers; `DrinkLog` shape and `DB_VERSION` untouched (data-model.md)
- [X] T003 Unit tests for both helpers in `tests/unit/store/drinks-by-venue.test.ts` via `fake-indexeddb`: casing/whitespace-insensitive matching, null bucket contents, newest-first order, casing resolution hit + verbatim miss

**Checkpoint**: Store read layer ready — US1, US2, US3 can now proceed in parallel.

---

## Phase 3: User Story 1 — Log a drink café-first (Priority: P1) 🎯 MVP

**Goal**: The `#/log` form leads with the café; bean detail collapses behind one
"Add drink details" expander; rating stays the only required field
(FR-001…FR-004, contract `cafe-browse-ui.contract.md` §1).

**Independent Test**: Open `#/log` — venue field first and most prominent;
name/origin/process/roast hidden behind a collapsed expander; rating-only save
still succeeds; café type-ahead and free-typed venues still work.

### Implementation for User Story 1

- [X] T004 [US1] Rework `src/components/DrinkLogForm.tsx` field order to venue → rating → flavour tags, moving coffee name / origin country / process / roast inside a single collapsed-by-default "Add drink details" expander (all four keep current behaviour when expanded); rating-required save gate and `makeDrinkLog` submit path unchanged (FR-001/002/003)
- [X] T005 [US1] Add optional `initial?: Partial<DrinkInput>` prop to `src/components/DrinkLogForm.tsx` seeding venue/rating/name/tags state (every seeded field stays editable) — the single-form review surface decided in research D6; pure prop-plumbing, no behaviour change when absent
- [X] T006 [P] [US1] Component test in `tests/unit/components/drink-log-form.test.tsx`: venue field rendered first, expander collapsed by default and reveals all four detail fields, Save disabled until rating set, rating-only submit produces a valid `DrinkInput`, `initial` prefill renders editable values
- [ ] T007 [US1] Mobile-viewport verification (≤ 430 px) of `#/log`: venue prominent without scrolling, all touch targets ≥ 44×44, expander usable one-handed; capture screenshot/note as PR evidence (constitution Principle III)

**Checkpoint**: Café-first manual logging fully functional and shippable on its own.

---

## Phase 4: User Story 2 — Log a drink by voice (Priority: P1)

**Goal**: Mic button on `#/log` → Web Speech transcript → one
`structure_drink_note` Claude call → validated, normalized draft prefills the
café-first form for explicit review/save (FR-009…FR-016, contract
`drink-structuring.contract.md`).

**Independent Test**: Speak *"oat flat white at Sunday's Coffee, four stars,
fruity and bright"* → form prefills venue/name/rating/tags; editing then saving
persists edited values; dismissing saves nothing; no-rating drafts keep Save
disabled; offline/unavailable speech degrades to manual with a clear reason.

**Note**: T005 (the `initial` prop) is the only US1 artifact US2 consumes — land
T004/T005 first if running stories sequentially; if parallel, US2's T015 waits on T005.

### Implementation for User Story 2

- [X] T008 [P] [US2] Create `src/ai/schemas/drink.ts`: `VoiceDrinkDraftSchema` (`venue`/`coffee_name` nullable strings, `rating` nullable int 1–5, `flavour_tags` array of `z.enum(FLAVOUR_TAGS)`), `VoiceDrinkDraft` type, deterministic `normalizeDrinkDraft()` (dedupe order-preserving, cap at first 3 — removal only), `isEmptyDrinkDraft()` (all null + no tags) per data-model.md
- [X] T009 [P] [US2] Create `src/ai/prompts/drink.ts`: `DRINK_TOOL_NAME = 'record_drink_log'`, tool description, `buildDrinkPrompt(transcript)` encoding the contract's prompt obligations — only explicit values, unmentioned → null/[], strip "at/in" from venue, explicit ratings only (vague praise → null, halves round down), palette-only flavours with enumerated synonyms, omission over near-miss mapping
- [X] T010 [P] [US2] Add `'structure_drink_note'` to the `TelemetryRecord['call']` union in `src/lib/telemetry.ts`
- [X] T011 [US2] In `src/ai/client.ts`: add `'record_drink_log'` to `ClaudeToolName`, add `DrinkDraftEmptyError` ("Didn't catch that — try again, or log it by hand."), and `structureDrinkNote(transcript)` → `callClaudeTool` (`call: 'structure_drink_note'`, `inputTextChars: transcript.length`, `inputImageBytes: null`) → `normalizeDrinkDraft` → throw `DrinkDraftEmptyError` if `isEmptyDrinkDraft` (depends on T008, T009, T010)
- [X] T012 [P] [US2] Unit tests in `tests/unit/ai/drink-schema.test.ts`: schema accepts valid drafts and all-null drafts; rejects rating 0/6/non-int and off-palette tags; `normalizeDrinkDraft` dedupes and caps at first three; `isEmptyDrinkDraft` truth table
- [X] T013 [US2] Record golden fixture `tests/ai-fixtures/drink-structuring/flat-white-four-stars/` (`input.transcript.json`, `recorded-response.json` from one real call, `expected-output.json` post-validation+normalization) and add the replay assertion (recorded-response → schema → normalize → deep-equal expected) to `tests/unit/ai/drink-schema.test.ts` (Principle II gate; depends on T008, T011)
- [X] T014 [US2] Create `src/components/DrinkRecorder.tsx`: ≥ 44×44 thumb-zone mic button reusing `startTranscription`/`isSpeechRecognitionAvailable` from `src/lib/speech.ts` unchanged; states idle → listening (interim transcript + explicit stop) → structuring (spinner, transcript visible) → error (retryable message, transcript kept on screen); unavailable/denied → non-blocking notice naming the reason (contract §2; depends on T011)
- [X] T015 [US2] In `src/views/DrinkLogView.tsx`: mount `DrinkRecorder` above the form; on draft, apply `resolveVenueCasing` (T002) and prefill `DrinkLogForm` via `initial` (T005); Save remains the only persistence path (rating-null drafts keep it disabled); dismiss/navigate-away stops recognition and discards the draft (FR-012/013; depends on T005, T014)
- [ ] T016 [US2] Mobile-viewport verification of the voice flow per quickstart.md: happy path ≤ ~10 s to review, no-rating draft blocks save, >3 flavours capped, offline → retryable error with transcript visible and manual form working, denied mic → notice; screenshot/note as PR evidence

**Checkpoint**: Voice logging works end-to-end; manual café-first flow unaffected.

---

## Phase 5: User Story 3 — Browse history by café (Priority: P2)

**Goal**: History cards headline the café; café tap opens
`#/drinks/at/<venue>` (all that café's drinks); venue-less entries live under a
labelled `#/drinks/no-cafe` bucket (FR-005…FR-008, contract
`cafe-browse-ui.contract.md` §3–§5).

**Independent Test**: Log two drinks at one café and one with no venue → cards
headline café / "No café"; café tap shows exactly its two drinks newest-first;
"No café" tap shows the third; pre-006 entries all still render; works offline.

### Implementation for User Story 3

- [X] T017 [P] [US3] Rework `src/components/DrinkCard.tsx`: café name as headline (muted "No café" when absent); rating, drink name, tags, logged time as secondary line; café area is a ≥ 44×44 tap target navigating to `#/drinks/at/<encodeURIComponent(venue)>` or `#/drinks/no-cafe` (FR-005/007)
- [X] T018 [US3] In `src/App.tsx`: route `#/drinks/at/<encoded-venue>` and `#/drinks/no-cafe` to `DrinksView` with a venue filter prop, matched before plain `#/drinks`; Drinks nav tab stays active on sub-routes; FAB remains visible (contract §5)
- [X] T019 [US3] In `src/views/DrinksView.tsx`: filtered mode via `listDrinksByVenue` (T002) — title = stored-casing café name or "No café", entries newest first, empty state links back to `#/drinks`; unfiltered list unchanged apart from the re-weighted cards (FR-006/007; depends on T017, T018)
- [ ] T020 [US3] Mobile-viewport + offline verification: history and both venue routes render from IndexedDB with network disabled; pre-existing (pre-006) drinks display intact (SC-006); screenshot/note as PR evidence

**Checkpoint**: All three stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T021 Run the full quickstart.md walkthrough (all three "Verify" sections) in a ≤ 430 px viewport; fix any deviations found
- [X] T022 Final gates: `npx tsc --noEmit`, `npm run lint`, `npm run test` (including fixture replay) all green; confirm `window.__telemetry.session()` shows exactly one `structure_drink_note` record per voice attempt and zero for manual logs
- [ ] T023 PR preparation: link `specs/006-cafe-voice-drink-logging/`, attach mobile verification evidence (T007/T016/T020), state cost audit "1 Claude call per voice log, 0 per manual log" in the PR description (constitution quality gates)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: none — start immediately
- **Phase 2 (Foundational)**: after T001 — blocks US2 (T015) and US3 (T019)
- **Phase 3 (US1)**: after Phase 2 (nominally; only truly needs T001)
- **Phase 4 (US2)**: after Phase 2; T015 additionally needs T005 from US1
- **Phase 5 (US3)**: after Phase 2; independent of US1/US2
- **Phase 6 (Polish)**: after all desired stories

### Story Dependency Notes

- **US1 → US2**: the `initial` prefill prop (T005) is the voice-review surface.
  This is the single deliberate cross-story dependency (research D6: one form,
  two modes). Everything else in US2 is independent of US1.
- **US3** is fully independent of US1 and US2 — only Phase 2 is required.

### Within-Story Order

- US2: T008/T009/T010 [P] → T011 → {T012 [P], T013, T014} → T015 → T016
- US3: T017/T018 may proceed in parallel → T019 → T020

### Parallel Opportunities

- T008, T009, T010 — three different new/independent files
- T006 (US1 test) alongside any US2/US3 work
- T012 alongside T013/T014
- T017 (DrinkCard) and T018 (App routes) — different files
- Whole stories: US3 can be built by a second developer the moment Phase 2 lands

---

## Parallel Example: User Story 2

```text
# After T002/T003 (foundation), launch together:
Task: "T008 Create src/ai/schemas/drink.ts (schema + normalize + empty check)"
Task: "T009 Create src/ai/prompts/drink.ts (tool name/description/prompt)"
Task: "T010 Add 'structure_drink_note' to src/lib/telemetry.ts call union"

# Then T011 (client.ts), then in parallel:
Task: "T012 Unit tests in tests/unit/ai/drink-schema.test.ts"
Task: "T014 Create src/components/DrinkRecorder.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 → T002/T003 → T004–T007
2. **STOP and VALIDATE**: café-first manual logging is a complete, shippable
   re-orientation even with zero voice work
3. Demo / merge if desired

### Incremental Delivery

1. Setup + Foundational → store helpers tested
2. US1 → café-first form (MVP!)
3. US2 → voice logging on top of the same form
4. US3 → café-headlined history + venue routes
5. Polish → quickstart walkthrough + gates + PR evidence

Each increment leaves every earlier story working — no story rewires another's
code path (the only shared seam, the `initial` prop, lands in US1).

---

## Notes

- No DB migration anywhere — any task touching `src/store/db.ts` is out of scope
  and signals drift (plan.md: `DB_VERSION` stays 3)
- `src/lib/speech.ts` is reused **unchanged**; a task editing it signals drift
- Persisted writes flow only through existing `makeDrinkLog` → `addDrink`
- Commit after each task or logical group; stop at any checkpoint to validate
