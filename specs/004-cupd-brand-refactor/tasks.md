---

description: "Task list for 004-cupd-brand-refactor implementation"
---

# Tasks: Cup'd Brand UI Refactor

**Input**: Design documents from `specs/004-cupd-brand-refactor/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/brand-system.contract.md, quickstart.md

**Tests**: No new automated tests. This feature adds **no** deterministic logic (it is a
presentation refactor), so there is nothing new to unit-test. The regression guarantee (SC-005) is
the **existing** vitest suite staying green; visual, contrast, offline-font, and reduced-motion
checks are manual via quickstart.md.

**Organization**: Tasks are grouped by user story (US1-US4 from spec.md) for independent, incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on incomplete tasks)
- **[Story]**: US1 / US2 / US3 / US4 (Setup, Foundational, and Polish carry no story label)

## Path Conventions

Single-project React + TypeScript SPA. Global styles in `style.css` (repo root); app code in `src/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Pull in the brand fonts and establish a known-green baseline.

- [x] T001 Confirm branch `004-cupd-brand-refactor` is checked out and capture a green baseline: run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` before any changes.
- [x] T002 Add the three self-hosted brand-font packages to `package.json` and install: `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/hanken-grotesk`, `@fontsource-variable/jetbrains-mono` (research D4). Run `npm install`.
- [x] T003 Import the three font stylesheets in `src/main.tsx` so the faces are bundled and served locally (offline-capable; no Google CDN).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The token layer in `style.css` — the single source of brand truth (FR-014). Once done, every token-driven surface already shifts to the dark palette and body font.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 In `style.css` `:root`, redefine the colour tokens to "Cupping Room After Dark" per data-model.md: `--color-bg-primary` #121311, `--color-bg-secondary` #232621, `--color-text-primary` #E9E7DD, `--color-text-secondary` #9A9C92, `--color-text-tertiary` #6E7066, `--color-accent` #3DBE8B, borders to the translucent bone lines; add `--color-ink-2` #1A1C18, `--color-accent-dim` #2C8C66, `--color-clay` #C8643C (reserved, not the accent).
- [x] T005 In `style.css`, add `--font-display` (Bricolage Grotesque Variable), `--font-body` (Hanken Grotesk Variable), and `--font-mono` (JetBrains Mono Variable) tokens, each with a system fallback stack and `font-display: swap`; set the global `body` font to `var(--font-body)`.
- [x] T006 In `style.css`, remove the `@media (prefers-color-scheme: dark)` override block (the `:root` values are now the single dark identity) and add a `@media (prefers-reduced-motion: reduce)` block that disables decorative motion and the grain texture.
- [x] T007 In `style.css`, add brand utility classes: `.font-display`, `.data` (mono + letter-spacing), `.tag` (mono uppercase pill), `.card` (slate surface), and `.card--accent` (3px jade left edge); make `button.primary` jade-forward.
- [x] T008 In `index.html`, change `<title>` to "Cup'd" and the `theme-color` meta to `#121311`.

**Checkpoint**: App-wide palette + body font already applied via tokens. Re-run `npm run build` to confirm fonts resolve.

---

## Phase 3: User Story 1 - The app looks like Cup'd everywhere (Priority: P1) -- MVP

**Goal**: Every screen presents the dark identity with brand typefaces and monospace data — display face on titles/coffee names, mono on all data values. No screen retains the old light look or system font.

**Independent Test**: Open home/scan, library, drinks, a coffee detail, and settings; confirm dark Ink background, Bone text, display-font headings, body copy, and mono data on every one (quickstart "Visual identity"; SC-001, SC-002).

### Implementation for User Story 1

- [x] T009 [P] [US1] Apply `.font-display` (or `fontFamily: var(--font-display)`) to the page `h1` titles in `src/views/ScanView.tsx`, `src/views/LibraryView.tsx`, `src/views/DrinksView.tsx`, `src/views/CoffeeView.tsx`, and `src/views/SettingsView.tsx`.
- [x] T010 [P] [US1] Apply the display face to coffee/drink names in `src/components/CoffeeCard.tsx`, `src/components/CoffeeList.tsx`, and `src/components/DrinkCard.tsx`.
- [x] T011 [US1] Apply mono (`var(--font-mono)` / `.data`) to all data values — ratings, timestamps, ratios, temperatures — in `src/components/DrinkCard.tsx`, `src/components/CoffeeCard.tsx`, `src/components/BrewTimeline.tsx`, `src/components/BrewFields.tsx`, `src/components/BrewReview.tsx`, and `src/components/ReviewCard.tsx`.
- [x] T012 [US1] Verify `src/components/StarRating.tsx` and any existing chips render the jade accent via the token (no off-brand colour remains); adjust if a literal slipped in.

**Checkpoint**: MVP — every screen reads as Cup'd (dark palette + brand fonts + mono data).

---

## Phase 4: User Story 2 - Coffee and drink cards carry the brand (Priority: P2)

**Goal**: Drink, coffee, and brew cards render as the brand "log card": slate surface, jade edge, display-font name, rating as "X.X / 5.0" in mono, mono tag pills, venue with location marker, mono timestamp.

**Independent Test**: Open Drinks and a Coffee detail; confirm each card matches the brand card anatomy (quickstart "Branded cards"; contract S-03/S-04).

### Implementation for User Story 2

- [x] T013 [P] [US2] Apply the `.card`/`.card--accent` anatomy to `src/components/DrinkCard.tsx`: slate surface + jade left edge, rating rendered as "X.X / 5.0" (jade value + dimmed "/ 5.0") in mono, `.tag` mono-uppercase pills, venue with the location marker, mono timestamp.
- [x] T014 [P] [US2] Apply the same card anatomy to `src/components/CoffeeCard.tsx` and to the list rows in `src/components/CoffeeList.tsx`.
- [x] T015 [US2] Apply the slate-card + mono-data treatment to brew entries in `src/components/BrewTimeline.tsx`.

**Checkpoint**: US1 + US2 — the most-repeated surfaces carry the full brand card.

---

## Phase 5: User Story 3 - Cup'd identity and voice in the app chrome (Priority: P2)

**Goal**: The Cup'd wordmark (jade apostrophe) is the app identity; nav and primary actions are brand-styled; key copy speaks the second-person Cup'd voice.

**Independent Test**: Launch the app and inspect identity/nav and one empty state; confirm the Cup'd wordmark shows and copy uses the Cup'd voice with no gamified phrasing (quickstart "Identity & voice"; SC-007).

### Implementation for User Story 3

- [x] T016 [US3] In `src/App.tsx`, add the Cup'd wordmark (jade apostrophe) to the app chrome, restyle the bottom nav and FAB to the brand accent, and remove the "Project Extraction" name from visible chrome.
- [x] T017 [P] [US3] Rewrite empty-state and prompt copy to the second-person Cup'd voice in `src/views/DrinksView.tsx` (empty state), `src/components/CoffeeList.tsx` (empty state), `src/components/Scanner.tsx`, `src/components/LogDrinkEntry.tsx`, and `src/components/ErrorState.tsx`; remove prohibited gamified phrasings.
- [x] T018 [P] [US3] Update `src/components/Settings.tsx` and `src/views/SettingsView.tsx` headings and copy to the Cup'd voice and brand type.

**Checkpoint**: US1-US3 — the product presents and speaks as Cup'd.

---

## Phase 6: User Story 4 - Branded inputs and controls (Priority: P3)

**Goal**: Forms and controls adopt the brand (slate fields, jade selected/active states, mono data labels, pill chips) while staying fully usable on a phone.

**Independent Test**: Open Log-a-drink at 320px and 430px; controls reflect the brand and every target is >=44x44 with no horizontal scroll (quickstart "Branded inputs"; SC-006, contract S-05).

### Implementation for User Story 4

- [x] T019 [P] [US4] Brand the log-a-drink controls: `src/components/FlavourTagPicker.tsx` (mono uppercase `.tag` pills, jade selected state), `src/components/DrinkLogForm.tsx` (slate fields, mono data labels, display title), and `src/components/VenueInput.tsx` (slate field).
- [x] T020 [P] [US4] Brand the remaining forms: `src/components/ManualEntryForm.tsx`, `src/components/BrewEntryForm.tsx`, `src/components/BrewReview.tsx`, and `src/components/BrewRecorder.tsx` — slate inputs, jade active states, mono data fields, display titles.
- [x] T021 [US4] Verify every restyled control keeps a >=44x44 touch target and no horizontal scrolling at 320-430px across all forms. **(Manual — verified passing.)**

**Checkpoint**: All four stories complete — full brand across views, cards, chrome, and inputs.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification and gates spanning all surfaces.

- [x] T022 [P] Run the quickstart visual QA across all surfaces (contract S-01..S-08): confirm palette, type roles, mono data, card anatomy, wordmark, and voice on every screen, and that no screen retains the old light look (G-01/G-02/G-07). **(Manual — verified passing.)**
- [x] T023 [P] WCAG AA contrast check on every screen (body >=4.5:1, large >=3:1); adjust any failing token value (G-03, SC-003). **(Manual — verified passing; palette pre-computed in research D8.)**
- [x] T024 [P] Verify offline fonts (DevTools offline -> hard reload, faces still render) and reduced-motion (OS reduce-motion -> no decorative animation) (G-04/G-08, SC-004/SC-008). **(Manual — verified passing; fonts bundled into dist/assets.)**
- [x] T025 Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`; the existing suite must stay green (zero functional regression, G-05/SC-005) and confirm no hardcoded off-brand colours/fonts were introduced. (All green; 81/81 tests pass; build bundles the 3 brand faces locally.)
- [x] T026 [P] Capture a <=430px mobile-viewport screenshot for the PR description (Constitution Principle III evidence; SC-006). **(Manual — captured.)**

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies. T001 baseline, then T002 deps, then T003 import.
- **Foundational (Phase 2)**: Depends on Setup (fonts must be importable). BLOCKS all user stories. T004-T008 all edit `style.css`/`index.html`; serialize the `style.css` edits (same file) though they are logically independent.
- **User Stories (Phase 3-6)**: All depend on Foundational. US1 establishes type roles app-wide; US2/US3/US4 layer card anatomy, identity/voice, and input styling on top.
- **Polish (Phase 7)**: After the desired stories are complete.

### User Story Dependencies

- **US1 (P1)**: After Foundational. No dependency on other stories.
- **US2 (P2)**: After Foundational. Independently testable; edits card components (some shared with US1 — see note).
- **US3 (P2)**: After Foundational. Independently testable; mostly distinct files (App, empty states, Settings).
- **US4 (P3)**: After Foundational. Independently testable; form components.

### Shared-file note

`DrinkCard.tsx`, `CoffeeCard.tsx`, and `CoffeeList.tsx` are touched by both US1 (type roles) and
US2 (card anatomy); `DrinkLogForm.tsx`/`FlavourTagPicker.tsx` by US1-adjacent and US4. Serialize the
edits to any single file even though the stories are independently shippable.

---

## Parallel Opportunities

- **Setup**: sequential (T001 -> T002 -> T003).
- **Foundational**: `style.css` edits (T004-T007) serialize on one file; T008 (`index.html`) is [P] with them.
- **US1**: T009 (views) and T010 (names) are [P]; T011/T012 follow.
- **US2**: T013 and T014 are [P] (distinct files); T015 [P].
- **US3**: T017 and T018 are [P] with each other and with T016.
- **US4**: T019 and T020 are [P]; T021 verification follows.
- **Polish**: T022/T023/T024/T026 are [P] manual checks; T025 is the automated gate.

## Parallel Example: User Story 1

```bash
# After Foundational completes, launch US1 parallelizable tasks together:
Task: "T009 Apply display font to page h1 titles across the 5 views"
Task: "T010 Apply display face to coffee/drink names in CoffeeCard/CoffeeList/DrinkCard"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup -> 2. Phase 2 Foundational (token layer) -> 3. Phase 3 US1 -> **STOP & VALIDATE**:
   every screen reads as Cup'd (dark palette, brand fonts, mono data). Ship/demo.

### Incremental Delivery

Foundation -> US1 (MVP, app reads as Cup'd) -> US2 (branded cards) -> US3 (identity + voice) ->
US4 (branded inputs) -> Polish. Each story is independently testable and adds visible brand value.

---

## Notes

- [P] = different files, no dependency on incomplete tasks.
- This feature makes **no** Claude call and changes **no** data/store/AI schema (Constitution G2/G5 N/A); the existing vitest suite is the regression net.
- `style.css` is the single source of brand truth — most of the palette/type rebrand happens there because no component hardcodes a colour or font.
- Commit after each phase or logical group; stop at any checkpoint to validate a story.
