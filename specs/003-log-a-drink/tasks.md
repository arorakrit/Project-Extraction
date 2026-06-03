---

description: "Task list for 003-log-a-drink implementation"
---

# Tasks: Log a Drink

**Input**: Design documents from `specs/003-log-a-drink/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/drinks-store.contract.md, quickstart.md

**Tests**: Included. The constitution's Development Workflow gate requires unit tests for
deterministic logic (store validators/reducers); component behaviour tests are added for the
rating-gate, flavour-cap, and venue type-ahead contracts. Write each test before its implementation
and confirm it fails first.

**Organization**: Tasks are grouped by user story (US1–US4 from spec.md) for independent, incremental delivery.

**Implementation note**: Test files were placed under the repo's existing layout —
`tests/unit/store/drinks.test.ts` and `tests/unit/components/*.test.tsx` — rather than the flat
`tests/unit/*.test.ts(x)` paths sketched below, to match how `001`/`002` organize tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4 (Setup, Foundational, and Polish carry no story label)

## Path Conventions

Single-project React + TypeScript SPA. Source at `src/`, tests at `tests/unit/` (repo root), per plan.md.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the working baseline before changing anything. No new dependencies are required.

- [x] T001 Confirm branch `003-log-a-drink` is checked out, run `npm install`, and verify the baseline is green with `npm run typecheck`, `npm run lint`, and `npm test` before making changes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Local data layer that every user story writes through. NO AI call is involved (Constitution G2/G5 N/A).

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T002 [P] Create the fixed flavour palette in `src/lib/flavours.ts`: `FlavourTag` union (`fruity|floral|chocolatey|nutty|bright|heavy`), `FLAVOUR_TAGS` ordered array, `FLAVOUR_LABELS` record, and `MAX_FLAVOUR_TAGS = 3` (per contracts/drinks-store.contract.md section 1).
- [x] T003 [P] Write store + migration unit tests in `tests/unit/store/drinks.test.ts` covering contract guarantees C-01–C-05, C-07, C-08, C-09 (`makeDrinkLog` valid/invalid cases, string normalization, add->list newest-first, delete isolation, `StaleDrinkSchemaError`, and v2->v3 migration creating `drinks` without disturbing `coffees`/`brews`/`settings`). Confirm they fail first.
- [x] T004 [P] Bump `DB_VERSION` 2 -> 3 and add `if (oldVersion < 3) db.createObjectStore('drinks', { keyPath: 'id' })` in `src/store/db.ts`; add the `drinks` store to the `ProjectExtractionDB` schema typed as `DrinkLog` (forward-only, no index — data-model.md).
- [x] T005 Create entity types and the validating factory in `src/store/drinks.ts`: `DrinkLog`, `DrinkInput`, `Process`, `RoastLevel`, `makeDrinkLog(input)` (assigns `id`/`logged_at`/`schema_version`; trims & null-normalizes strings; clamps lengths; throws on bad `rating`, >3/duplicate/non-palette `flavour_tags`, or invalid `process`/`roast_level`), and `StaleDrinkSchemaError`. Depends on T002.
- [x] T006 Implement persistence functions in `src/store/drinks.ts`: `addDrink` (guards `schema_version===1`), `getDrink`, `listDrinks` (filter `schema_version===1`, sort `logged_at` descending), `deleteDrink`. Depends on T004, T005. Run T003 — store/migration tests now pass.

**Checkpoint**: Data layer ready and tested — user stories can begin.

---

## Phase 3: User Story 1 - Log and save a drink in seconds (Priority: P1) — MVP

**Goal**: From a home entry point or FAB, set a star rating and save; the entry appears at the top of drink history. Rating-only, no account, offline.

**Independent Test**: Cold start -> tap entry point -> tap a star -> Save -> the new entry shows at the top of `#/drinks` with its rating and time, having entered no other field and no sign-in (quickstart "Happy path"; SC-001).

### Tests for User Story 1

- [x] T007 [P] [US1] Component tests in `tests/unit/components/drink-log-form.test.tsx`: Save is blocked until a rating is selected and surfaces the requirement, writing nothing (U-01); a rating-only save succeeds (U-04). Confirm they fail first.

### Implementation for User Story 1

- [x] T008 [P] [US1] Create reusable `src/components/StarRating.tsx` (1–5 single-tap stars, controlled value, >=44x44 targets, "no rating yet" state).
- [x] T009 [P] [US1] Create `src/components/DrinkCard.tsx` rendering one history row: rating, logged time, and placeholders for name/venue/tags (filled by later stories).
- [x] T010 [US1] Create `src/components/DrinkLogForm.tsx` with the StarRating field and a Save action disabled until a rating is set; emit a `DrinkInput` on save. Depends on T008.
- [x] T011 [US1] Create `src/views/DrinkLogView.tsx` (route `#/log`): host the form, on save call `makeDrinkLog` -> `addDrink`, then `navigate('#/drinks')`; back/cancel writes nothing. Depends on T010, T006.
- [x] T012 [US1] Create `src/views/DrinksView.tsx` (route `#/drinks`): render `listDrinks()` newest-first via `DrinkCard`, with an empty state and a "Log a drink" affordance. Depends on T009, T006.
- [x] T013 [US1] Wire navigation in `src/App.tsx`: add `#/log` and `#/drinks` routes, a "Drinks" bottom-nav tab, and a persistent floating action button (thumb-zone, >=44x44) that navigates to `#/log`. Depends on T011, T012.
- [x] T014 [P] [US1] Add a "Log a drink" entry point to the home screen in `src/views/ScanView.tsx` that navigates to `#/log` (FR-001 home entry point). Implemented via `src/components/LogDrinkEntry.tsx`. Depends on T011.

**Checkpoint**: MVP — a drink can be logged and seen in history, fully offline, no account. Run T007.

---

## Phase 4: User Story 2 - Identify where the drink was had (Priority: P2)

**Goal**: Record a venue via type-ahead suggested from prior logs, free-typing when no match exists; the venue shows in history and seeds future suggestions.

**Independent Test**: Log a free-typed venue; start a second log and type its prefix -> it appears as a suggestion within three characters and can be tapped; both entries show the venue (quickstart "Venue type-ahead"; SC-005).

### Tests for User Story 2

- [x] T015 [US2] Extend `tests/unit/store/drinks.test.ts` with `listVenues` tests (C-06): distinct, case-insensitive de-dup, nulls excluded, newest-first, and a newly logged venue surfacing on the next call. Confirm they fail first.
- [x] T016 [P] [US2] Create `tests/unit/components/venue-input.test.tsx`: suggestions filter by typed prefix and a free-typed value not in the list is accepted (U-03). Confirm they fail first.

### Implementation for User Story 2

- [x] T017 [US2] Implement `listVenues()` in `src/store/drinks.ts` (distinct non-null trimmed venues, case-insensitive first-seen casing, ordered by most recent `logged_at`). Depends on T006. Run T015.
- [x] T018 [P] [US2] Create `src/components/VenueInput.tsx`: controlled `<input>` backed by a native `<datalist>` of `listVenues()` results, always accepting a free-typed value (research D5).
- [x] T019 [US2] Add the venue field to `src/components/DrinkLogForm.tsx` and include `venue` in the emitted `DrinkInput`. Depends on T018. Run T016.
- [x] T020 [US2] Render the venue on `src/components/DrinkCard.tsx` when present.

**Checkpoint**: US1 + US2 work independently. Run T015, T016.

---

## Phase 5: User Story 3 - Tag flavour notes fast (Priority: P2)

**Goal**: Single-tap up to three flavour tags from the fixed six; selections persist and show in history.

**Independent Test**: Tap three tags (all highlight), tap a fourth (rejected, limit shown), re-tap one (deselects), save -> only selected tags appear on the entry (quickstart "Flavour tags"; SC-007).

### Tests for User Story 3

- [x] T021 [P] [US3] Create `tests/unit/components/flavour-picker.test.tsx`: tap selects, re-tap deselects, and a 4th selection is refused at `MAX_FLAVOUR_TAGS` (U-02). Confirm they fail first.

### Implementation for User Story 3

- [x] T022 [P] [US3] Create `src/components/FlavourTagPicker.tsx` using `FLAVOUR_TAGS`/`FLAVOUR_LABELS` from `src/lib/flavours.ts`: single-tap toggle chips (>=44x44), hard cap at three with a clear limit indication. Depends on T002. Run T021.
- [x] T023 [US3] Add the flavour picker to `src/components/DrinkLogForm.tsx` and include `flavour_tags` in the emitted `DrinkInput`. Depends on T022.
- [x] T024 [US3] Render flavour tags on `src/components/DrinkCard.tsx` when present.

**Checkpoint**: US1–US3 work independently. Run T021.

---

## Phase 6: User Story 4 - Capture optional coffee detail (Priority: P3)

**Goal**: Optionally add coffee name, origin country, process (washed/natural/honey), and roast level (light/medium/dark); leaving them blank still saves.

**Independent Test**: Save a drink with name + origin + process + roast -> all show on the entry; save another with only a rating -> still succeeds (quickstart "Optional detail").

### Tests for User Story 4

- [x] T025 [P] [US4] Extend `tests/unit/components/drink-log-form.test.tsx`: provided name/origin/process/roast persist into the emitted `DrinkInput`, and a rating-only save still succeeds with those fields absent. Confirm new assertions fail first.

### Implementation for User Story 4

- [x] T026 [US4] Add to `src/components/DrinkLogForm.tsx`: a free-text coffee-name input, a free-text origin-country input, and single-tap segmented selectors for `process` (washed/natural/honey) and `roast_level` (light/medium/dark); include all four in the emitted `DrinkInput`. Depends on T010. Run T025.
- [x] T027 [US4] Render name, origin, process, and roast on `src/components/DrinkCard.tsx` when present.

**Checkpoint**: All four stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification and gates spanning all stories.

- [x] T028 [P] Mobile verification at <=430px per Constitution Principle III: confirm the home entry point, FAB, stars, flavour chips, and process/roast selectors are all >=44x44 and thumb-reachable; capture a screenshot for the PR description. **(Manual — verified and passing.)**
- [x] T029 [P] Run the full `specs/003-log-a-drink/quickstart.md` walkthrough including offline (DevTools offline), restart-persistence, and rapid-successive-logs edge cases; confirm the dev token badge does NOT increment during logging (no AI call). **(Manual — verified and passing.)**
- [x] T030 Run `npm run typecheck`, `npm run lint`, and `npm test` and ensure all are green. (81/81 tests pass; typecheck + lint clean; production build succeeds.)
- [x] T031 [P] Update `README.md` to mention manual drink logging and link `specs/003-log-a-drink/`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories. Within it: T002 and T003 are [P]; T004 [P]; T005 depends on T002; T006 depends on T004 + T005.
- **User Stories (Phase 3–6)**: All depend on Foundational. US1 is the MVP and also establishes the form/card/views/routing that later stories extend.
- **Polish (Phase 7)**: After the desired stories are complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational. No dependency on other stories.
- **US2 (P2)**: After Foundational. Independently testable; edits the US1 form/card files (see shared-file note).
- **US3 (P2)**: After Foundational. Independently testable; edits the US1 form/card files.
- **US4 (P3)**: After Foundational. Independently testable; edits the US1 form/card files.

### Shared-file note

US2/US3/US4 each extend `src/components/DrinkLogForm.tsx` and `src/components/DrinkCard.tsx` (created in US1). These cross-story edits to shared files mean those specific tasks should be serialized if worked in parallel, even though each story remains independently *shippable* and *testable*.

### Within Each Story

- Tests are written first and must fail before implementation.
- Store/lib before components; components before views; views before App wiring.

---

## Parallel Opportunities

- **Foundational**: T002, T003, T004 can run in parallel (distinct files); T005 then T006 serialize on the store file.
- **US1**: T007 (test), T008 (StarRating), T009 (DrinkCard) are [P]; T014 (ScanView) is [P] with T013.
- **US2**: T016 (VenueInput test) and T018 (VenueInput) are [P] with store work; T019/T020 edit shared files (serialize).
- **US3**: T021 (test) and T022 (picker) are [P]; T023/T024 edit shared files (serialize).
- Across teams, US2/US3/US4 can be developed against the US1 baseline in parallel, coordinating edits to the two shared files.

## Parallel Example: User Story 1

```bash
# After Foundational completes, launch US1 parallelizable tasks together:
Task: "T007 Component tests for rating gate + rating-only save in tests/unit/components/drink-log-form.test.tsx"
Task: "T008 StarRating component in src/components/StarRating.tsx"
Task: "T009 DrinkCard component in src/components/DrinkCard.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup -> 2. Phase 2 Foundational (data layer) -> 3. Phase 3 US1 -> **STOP & VALIDATE** the
   under-30-second log flow (SC-001) -> ship/demo.

### Incremental Delivery

Foundation -> US1 (MVP) -> US2 (venue) -> US3 (flavour tags) -> US4 (optional detail) -> Polish. Each
story adds value and is independently testable without breaking the previous ones.

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- This feature makes **no** Claude call — no AI schemas, no `tests/ai-fixtures/` entry, no telemetry change (Constitution G2/G5 N/A).
- Rating is the only required field; everything else is optional and the whole flow works offline with no account.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.
