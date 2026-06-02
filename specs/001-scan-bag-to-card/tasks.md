---

description: "Task list for feature 001-scan-bag-to-card — Scan Bag to Coffee Card"
---

# Tasks: Scan Bag to Coffee Card

**Input**: Design documents from `/specs/001-scan-bag-to-card/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/, quickstart.md

**Tests**: The spec does not explicitly request tests, but the **constitution
mandates** unit tests for the AI schema validators (≥ 90% coverage), AI golden
fixtures as the regression net for any prompt/schema change (Principle II), and
unit tests for the local-store CRUD. UI component tests are NOT in scope for
v1. Test tasks below cover exactly that constitutional minimum.

**Organization**: Tasks are grouped by user story to enable independent
implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3); omitted for Setup/Foundational/Polish phases
- Each task description includes the exact file path

## Path Conventions

Single-project Vite SPA (Option 1 per plan.md). All new source under `src/`;
all tests under `tests/`; both at the repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: TypeScript, tooling, linting, and the basic Vite SPA shell. Nothing
story-specific yet.

- [X] T001 Add TypeScript to the project: install `typescript@^5.6`, `@types/react@^18.3`, `@types/react-dom@^18.3` as devDependencies (`package.json`); create strict-mode `tsconfig.json` at repo root with `"target": "ES2022"`, `"jsx": "react-jsx"`, `"moduleResolution": "Bundler"`, `"strict": true`, `"noUncheckedIndexedAccess": true`, paths rooted at `src/`
- [X] T002 [P] Migrate Vite config: rename `vite.config.js` → `vite.config.ts`; add path alias `@` → `src/` so imports stay short
- [X] T003 [P] Install runtime dependencies: `zod@^3.23`, `zod-to-json-schema@^3.23`, `idb@^8` in `package.json`
- [X] T004 [P] Install test/lint dev dependencies: `vitest@^2`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`, `fake-indexeddb@^6`, `jsdom@^25`, `eslint@^9`, `@typescript-eslint/parser@^8`, `@typescript-eslint/eslint-plugin@^8`, `eslint-plugin-react-hooks@^5` in `package.json`
- [X] T005 [P] Configure ESLint at repo root: create `eslint.config.js` with TypeScript + React-hooks rules; add `"lint": "eslint src tests"` script to `package.json`
- [X] T006 [P] Configure Vitest: add `vitest.config.ts` at repo root using `jsdom` environment, setting up `fake-indexeddb/auto` in a `tests/setup.ts` file; add `"test": "vitest run"`, `"test:watch": "vitest"`, `"typecheck": "tsc --noEmit"` scripts to `package.json`
- [X] T007 Create the new source directory layout: `src/{ai/{schemas,prompts},store,lib,components,views}`, `tests/{unit/{ai,store},ai-fixtures/{extraction,enrichment}}` (use `New-Item -ItemType Directory` placeholders or `.gitkeep` files where empty)
- [X] T008 Update `index.html` at repo root: add mobile viewport meta `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`; point the module script at `/src/main.tsx`
- [X] T009 [P] Replace `style.css` with a mobile-first base stylesheet: CSS custom properties for color tokens already referenced by starter, plus `--touch-target-min: 44px`; box-sizing reset; system-font stack; no media queries narrower than 430 px

**Checkpoint**: `npm run dev` boots Vite against the new TypeScript entry; `npm run typecheck` and `npm run lint` exit zero on an empty `src/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core modules required by every user story. Story 1 cannot start until
this phase is complete.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T010 Create the top-level React entry: `src/main.tsx` rendering `<App />` into `#root` (replaces root `main.jsx`)
- [X] T011 Create the app shell with hash-based routing in `src/App.tsx`: three routes (`#/scan`, `#/library`, `#/coffee/:id`) plus `#/settings`; render the matching view; minimal nav bar (Scan / Library) at bottom of viewport (thumb-zone) with 44×44 touch targets (replaces root `App.jsx`)
- [X] T012 [P] Implement IndexedDB shell in `src/store/db.ts`: open database `project-extraction` version 1 via `idb`'s `openDB`; in `upgrade()` create `coffees` (keyPath `id`) and `settings` (keyPath `key`) object stores; export a memoised `getDB()` accessor
- [X] T013 [P] Implement BYOK settings storage in `src/store/settings.ts`: `getApiKey()` and `setApiKey(key: string)` reading/writing the `anthropic_api_key` row in the `settings` store; depends on T012
- [X] T014 [P] Implement `src/lib/telemetry.ts`: in-memory ring buffer (size 100) of `TelemetryRecord` (shape in `data-model.md`); `record()`, `getSession()`, `aggregateTokens()`; exposes a global `window.__telemetry` accessor for the dev HUD
- [X] T015 [P] Implement `src/lib/retry.ts`: `retryOnce<T>(fn: () => Promise<T>, isRetryable: (err) => boolean, delayMs: number): Promise<T>` helper used by the AI client (per Principle V)
- [X] T016 [P] Implement `src/lib/image.ts`: `resizeForVision(dataUrl: string): Promise<string>` — decode via `createImageBitmap`, resize to max 1568 px long edge using `OffscreenCanvas` (fallback to `<canvas>` for Safari < 17), re-encode JPEG quality 0.85, return new data URL; pass through unchanged if already smaller
- [X] T017 Implement the Claude wrapper core in `src/ai/client.ts`: generic `callClaudeTool<T>({ tool, schema, messages })` that POSTs to `https://api.anthropic.com/v1/messages` with model `claude-sonnet-4-6`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`, forced `tool_choice`; on schema-parse failure uses `retry.ts` to retry once after 500 ms; emits a `TelemetryRecord` via `lib/telemetry.ts`; throws typed `ClaudeNetworkError | ClaudeSchemaError | MissingApiKeyError`; depends on T013, T014, T015
- [X] T018 Implement `src/components/Settings.tsx`: single-field form for the Anthropic key, with a dev-only token-spend HUD that pulls from `lib/telemetry.ts`; uses `store/settings.ts`; 44×44 inputs/buttons; depends on T013, T014
- [X] T019 Implement `src/views/SettingsView.tsx` wrapping `Settings` for the `#/settings` route; depends on T018
- [X] T020 Add a routing guard: in `src/App.tsx`, when the active view triggers a Claude call but `getApiKey()` returns null, navigate to `#/settings` first and restore the user's intended action on save (one-shot — stored in memory)
- [X] T021 Delete the leaky bundled-key path: remove any code that reads `import.meta.env.VITE_ANTHROPIC_KEY` (currently in `lib/claude.js`); update `.env` (locally, not committed) to remove the key entry if present; confirm via `grep` that no source file references `VITE_ANTHROPIC_KEY`
- [X] T022 [P] Set up the AI fixture infrastructure: create `tests/setup.ts` (already added in T006 — extend here) that imports `fake-indexeddb/auto`; create empty `tests/ai-fixtures/{extraction,enrichment}/.gitkeep` placeholders

**Checkpoint**: `npm run typecheck` passes against the empty stories. `npm run dev` lets the user open `#/settings`, enter a key, see it persisted across page reload. No Claude call yet — that's Story 1.

---

## Phase 3: User Story 1 — Capture a bag and see its coffee card (Priority: P1) 🎯 MVP

**Goal**: A user can photograph a coffee bag, wait a few seconds, and see a populated, editable coffee card on screen. This is the hero moment of the product.

**Independent Test**: On a phone (or 430-px-wide desktop viewport), photograph a real specialty coffee bag from `Samples_Coffee/` or fresh; verify a card appears within ~10 s with roaster/coffee name/origin/notes filled in; verify any field is tappable to edit; verify a deliberately blurry shot triggers the friendly error UX with both "try again" and "enter manually" reachable in one tap.

### Schemas, prompts, and AI client wiring for User Story 1

- [X] T023 [P] [US1] Define the extraction Zod schema in `src/ai/schemas/extraction.ts` — exact shape from `data-model.md` (`ExtractedCoffeeSchema`); export `ExtractedCoffee` inferred type
- [X] T024 [P] [US1] Define the extraction prompt and tool in `src/ai/prompts/extraction.ts`: export `EXTRACTION_SYSTEM_PROMPT` and `EXTRACTION_TOOL_DEFINITION`; the tool's `input_schema` MUST be **derived at module load** from `ExtractedCoffeeSchema` via `zodToJsonSchema()` — no hand-written JSON Schema. Single source of truth (constitution Principle II)
- [X] T025 [US1] Implement `extractCoffeeLabel(imageDataUrl: string)` in `src/ai/client.ts`: calls `lib/image.ts` to resize, base64-strips the data URL, builds the messages array (image + short user-text) per `contracts/extraction.contract.md`, invokes `callClaudeTool` with `ExtractedCoffeeSchema`; after parse, if every scalar is null AND `tasting_notes.length === 0`, throw `ExtractionEmptyError`; depends on T017, T023, T024
- [X] T026 [US1] Unit test the extraction schema: `tests/unit/ai/extraction-schema.test.ts` — covers happy path, every-field-null path, partial-extraction path, schema-failure path; asserts that schema rejection produces a Zod error with the offending field; constitution requires ≥ 90% coverage of validators (Principle II + Workflow gate); depends on T023
- [X] T027 [US1] Record at least one golden fixture: `tests/ai-fixtures/extraction/ethiopia-yirgacheffe/{recorded-response.json,expected-output.json,input.image-meta.json}` — use one of `20260421_152356868_iOS.jpg`, `20260421_152522437_iOS.jpg`, or a bag from `Samples_Coffee/` to capture the recorded response (manual one-shot against a real Claude key); commit the resulting JSON triplet
- [X] T028 [US1] Fixture replay test: `tests/unit/ai/extraction-fixtures.test.ts` — for every directory under `tests/ai-fixtures/extraction/*`, load `recorded-response.json`, run its tool_use input through `ExtractedCoffeeSchema.parse`, assert deep-equal with `expected-output.json`; depends on T023, T027
- [X] T029 [US1] Unit test the Claude client retry behavior: `tests/unit/ai/client.test.ts` — mock `fetch`, verify exactly one retry on schema-validation failure with the configured 500 ms backoff, verify zero retries on HTTP 5xx, verify telemetry records are emitted for both ok and failure paths; depends on T017

### UI for User Story 1

- [X] T030 [P] [US1] Implement `src/components/Scanner.tsx`: single `<input type="file" accept="image/*" capture="environment">` (the OS picker covers both camera and gallery — FR-001, FR-002); in-progress state machine `idle | extracting | error`; large 44×44+ capture button in thumb zone; reports the chosen image data URL upward via `onCapture(dataUrl: string)`; depends on T017 indirectly (no direct import — Scanner only emits)
- [X] T031 [P] [US1] Implement `src/components/ReviewCard.tsx`: takes an `ExtractedCoffee` plus a `UserEditedFields` ref; renders one row per field; empty/null rows show "—" with edit affordance; tasting notes rendered as chips with add/remove; "Save" button stub (wired up in Story 2 — for Story 1, the action just calls an `onAccept(coffee)` prop that the Scan view discards in-session); 44×44 touch targets throughout
- [X] T032 [P] [US1] Implement `src/components/ErrorState.tsx`: takes a `reason: 'no_text' | 'network' | 'schema'` plus `onRetry` and `onManualEntry` callbacks; renders the single user-facing message per spec ("Couldn't read the label — try a clearer photo, or enter the coffee manually") with two clearly tappable actions (FR-007)
- [X] T033 [P] [US1] Implement `src/components/ManualEntryForm.tsx`: a plain editable card with the same field shape as `ReviewCard` but starting empty; calls `onSubmit(extracted: ExtractedCoffee)` upward; no image; reused as the fallback for both extraction failure (FR-007) and camera-permission-denied (FR-020)
- [X] T034 [US1] Implement `src/views/ScanView.tsx`: orchestrates `Scanner` → calls `extractCoffeeLabel` → on success renders `ReviewCard`; on `ExtractionEmptyError`/`ClaudeSchemaError` renders `ErrorState`; on `MissingApiKeyError` navigates to `#/settings`; "Enter manually" path renders `ManualEntryForm`; depends on T025, T030, T031, T032, T033
- [X] T035 [US1] Wire `ScanView` into `App.tsx` routing for the `#/scan` route; make `#/scan` the default landing route; depends on T011, T034

**Checkpoint**: At this point Story 1 is functional end-to-end. Run `npm run dev`, capture a bag, see a card. No save yet — closing the tab discards the captured coffee. This is the MVP.

---

## Phase 4: User Story 2 — Save a coffee and revisit it later (Priority: P2)

**Goal**: Captured coffees can be saved to the device and viewed later, including offline. Library list shows all saved coffees; each coffee has a permanent detail page.

**Independent Test**: From the Story 1 review card, tap Save; confirm the app routes to a coffee detail page; navigate to Library and confirm the coffee appears; close the browser tab; **turn off network**; reopen the app; library and detail page render the saved coffee without error.

### Storage layer for User Story 2

- [X] T036 [P] [US2] Implement `src/store/coffees.ts` CRUD: `addCoffee(coffee: SavedCoffee)`, `getCoffee(id: string)`, `listCoffees()` (returns newest-first by `captured_at`), `updateCoffee(id, partial)`, `deleteCoffee(id)`; enforce invariants from `data-model.md` (the `extracted` field is never written after `addCoffee`; `schema_version` set to `1`); depends on T012
- [X] T037 [P] [US2] Unit test the coffees store: `tests/unit/store/coffees.test.ts` — uses `fake-indexeddb` from `tests/setup.ts`; covers add/get/list-ordering/update-partial/delete; covers the invariant that `updateCoffee` cannot replace `extracted` (assert it stays equal to its initial value across an update that targets `enriched` only); depends on T036

### UI for User Story 2

- [X] T038 [P] [US2] Implement `src/components/CoffeeCard.tsx` (read-only variant): takes a `SavedCoffee`; computes effective fields as `userEdits[field] ?? extracted[field]` per data-model invariant; renders the same row layout as `ReviewCard` but non-editable; placeholder section for enrichment rendered as `null` (filled in by Story 3); depends on T036
- [X] T039 [P] [US2] Implement `src/components/CoffeeList.tsx`: takes the result of `listCoffees()`; renders each item showing roaster + coffee name (effective values); item click navigates to `#/coffee/:id`; empty state ("No coffees yet — scan a bag to get started"); 44×44 row hit area
- [X] T040 [US2] Implement `src/views/LibraryView.tsx` for `#/library`: loads coffees via `listCoffees()` in a `useEffect`, renders `<CoffeeList>`; depends on T036, T039
- [X] T041 [US2] Implement `src/views/CoffeeView.tsx` for `#/coffee/:id`: parses id from hash, loads via `getCoffee()`, renders `<CoffeeCard>`; "Delete" action calls `deleteCoffee()` and routes back to `#/library`; depends on T036, T038
- [X] T042 [US2] Wire Save into `ScanView`: when the user taps Save on `ReviewCard`, build a `SavedCoffee` (generate `id` via `crypto.randomUUID()`, set `captured_at`, `source_image_data_url`, `extracted`, `user_edits`, `enriched: null`, `enrichment_attempted_at: null`, `schema_version: 1`), call `addCoffee()`, then navigate to `#/coffee/:id`; depends on T034, T036
- [X] T043 [US2] Wire `LibraryView` and `CoffeeView` into `App.tsx` routing; ensure nav bar's Library button is reachable from every view; depends on T011, T040, T041

**Checkpoint**: Stories 1 AND 2 together form a usable scanning library. Verify the spec's User Story 2 acceptance scenarios manually per quickstart.md.

---

## Phase 5: User Story 3 — Enrich the coffee card with deeper context (Priority: P3)

**Goal**: After saving a coffee, the app augments its card with origin story, producer context, and a brew recommendation — without ever overwriting user edits, and silently leaving fields empty when no reliable enrichment exists.

**Independent Test**: Save a coffee whose origin is well-known (e.g., an Ethiopian Yirgacheffe); within a few seconds the detail page shows additional sections (origin story, brew recommendation); reopen the detail page offline and confirm enrichment persists from local storage; save a coffee with an obscure or fabricated origin and confirm enrichment sections do NOT appear (no fabrication).

### Schemas, prompts, and AI client wiring for User Story 3

- [X] T044 [P] [US3] Define the enrichment Zod schema in `src/ai/schemas/enrichment.ts` — `EnrichedCoffeeSchema` and nested `BrewRecommendationSchema` per `data-model.md`; export `EnrichedCoffee` inferred type
- [X] T045 [P] [US3] Define the enrichment prompt and tool in `src/ai/prompts/enrichment.ts`: export `ENRICHMENT_SYSTEM_PROMPT` and `ENRICHMENT_TOOL_DEFINITION`; the tool's `input_schema` MUST be **derived at module load** from `EnrichedCoffeeSchema` via `zodToJsonSchema()` — no hand-written JSON Schema. The prompt MUST include an explicit "do not invent details" instruction so the model honors the no-fabrication rule (FR-016)
- [X] T046 [US3] Implement `enrichCoffeeProfile(effective: ExtractedCoffee)` in `src/ai/client.ts`: renders the prompt with effective fields, invokes `callClaudeTool` with `EnrichedCoffeeSchema`; no image; same retry-once policy as extraction; depends on T017, T044, T045
- [X] T047 [US3] Unit test the enrichment schema: `tests/unit/ai/enrichment-schema.test.ts` — covers happy path, all-fields-null path, `brew_recommendation: null` path, schema-failure path; depends on T044
- [X] T048 [US3] Record at least one golden fixture: `tests/ai-fixtures/enrichment/ethiopia-yirgacheffe/{recorded-response.json,expected-output.json}` using the same coffee as the extraction fixture so the chain is comparable; commit
- [X] T049 [US3] Fixture replay test: `tests/unit/ai/enrichment-fixtures.test.ts` — same pattern as T028 but for enrichment; depends on T044, T048

### UI for User Story 3

- [X] T050 [US3] Implement enrichment trigger in `src/views/CoffeeView.tsx`: in a `useEffect`, if the loaded coffee has `enriched === null` AND `enrichment_attempted_at === null` AND the API key is present, call `enrichCoffeeProfile()` with the effective ExtractedCoffee; on success call `updateCoffee(id, { enriched, enrichment_attempted_at: now })`; on any error call `updateCoffee(id, { enrichment_attempted_at: now })` only — silent to the user, per the enrichment contract; depends on T046, T036, T041
- [X] T051 [US3] Extend `src/components/CoffeeCard.tsx` to render enrichment sections when `coffee.enriched` is non-null: origin story paragraph, producer context paragraph, brew recommendation card (method · ratio · grind · temp); each section omitted independently when its field is null (FR-016); ensure user edits in `user_edits` are NEVER overwritten by enrichment values during render (the effective-field merge ordering is `userEdits ⊕ extracted` — enrichment never touches this merge, only adds new sections); depends on T038

**Checkpoint**: All three user stories now work end-to-end. The full feature matches the spec's success criteria SC-001 through SC-007.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Migrate away from the starter scaffolding, finalise documentation, and run the quickstart verification end-to-end.

- [X] T052 [P] Delete the starter scaffolding files now replaced by `src/`: root `App.jsx`, root `main.jsx`, `components/CoffeeCard.jsx`, `components/Scanner.jsx`, `components/VoiceLogger.jsx`, `lib/claude.js` (after confirming no source file references them — VoiceLogger is brew-log territory, future spec)
- [X] T053 [P] Update `package.json` `name` from `grind-coffee-scanner` to `project-extraction` and bump `version` to `0.1.0`; ensure all scripts (`dev`, `build`, `preview`, `test`, `test:watch`, `typecheck`, `lint`) are present and correct
- [ ] T054 [P] Run the constitution's mandatory mobile-first verification per Principle III: open the app at 393 px (iPhone 14 Pro) and 430 px (iPhone Pro Max) viewports; verify capture, save, library navigation, and coffee detail are all reachable in one thumb-zone tap with ≥ 44×44 touch targets; capture screenshots; attach to the eventual PR description
- [ ] T055 [P] Execute the quickstart.md verification end-to-end: Story 1 (capture → card), Story 2 (save → revisit offline), Story 3 (enrichment shows for well-known origin, hides for obscure). Run extraction across **at least 5 real specialty bags** (covering different roaster styles, processes, and origins) and tally the SC-002 field-accuracy rate plus the SC-004a/SC-004b edit-count distribution (per coffee: how many fields the tester corrected before tap-Save); record the SC-001 timing (photo → card ≤ 10 s) and the SC-006 timing (open → photo → save ≤ 60 s) on the same set; note results in the PR description
- [X] T056 Final typecheck + lint + test pass: `npm run typecheck && npm run lint && npm run test` exit zero
- [X] T057 Confirm constitution gates G1–G6 still hold against the implemented code (re-read `plan.md`'s Constitution Check); if any gate now fails, file a tasks-template-style task for the fix BEFORE merging

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories.**
- **User Story 1 / P1 / MVP (Phase 3)**: Depends on Foundational. Can ship alone as the MVP.
- **User Story 2 / P2 (Phase 4)**: Depends on Foundational + Story 1 (saving operates on a `ReviewCard` produced by Story 1's capture flow).
- **User Story 3 / P3 (Phase 5)**: Depends on Foundational + Story 2 (enrichment is triggered after save, attached to a saved record).
- **Polish (Phase 6)**: Depends on whichever stories you intend to merge.

### User Story Dependencies

Stories in this feature are **additively dependent** rather than fully independent:

- **Story 1 (P1)** stands alone as the MVP. It's the irreducible "I held up a bag, the app understood it" moment.
- **Story 2 (P2)** layers persistence on top of Story 1. You cannot test Save without first capturing.
- **Story 3 (P3)** layers enrichment on top of Story 2. You cannot test enrichment without first saving.

This is consistent with the spec's own "Why this priority" framing — Story 2 turns the demo into a library, Story 3 turns the library into a discovery companion.

### Within Each Story

- Schemas (`src/ai/schemas/*.ts`) MUST exist before the AI client function that uses them.
- AI client functions MUST exist before the view that calls them.
- Leaf components (Scanner, ReviewCard, ErrorState, ManualEntryForm, CoffeeCard, CoffeeList) can be built in parallel — they're independent files.
- Views that compose multiple components depend on all of them.
- Golden fixtures depend on the schema (so the test can validate against it).

### Parallel Opportunities

- **Setup**: T002, T003, T004, T005, T006, T009 can all run in parallel (different files, no dependencies).
- **Foundational**: T012, T013, T014, T015, T016 can run in parallel after T010/T011/the directory layout is in place. T017 depends on T013/T014/T015.
- **Story 1**: T023, T024, T030, T031, T032, T033 are all independent files — run in parallel. T025 depends on T023+T024. T026, T028, T029 depend on their respective implementations.
- **Story 2**: T036, T038, T039 are independent files. T037 depends on T036. Wiring tasks (T042, T043) depend on the components and store.
- **Story 3**: T044, T045 in parallel. T046 depends on them. T047, T049 depend on schemas/fixtures. T050 depends on T046.

---

## Parallel Example: User Story 1 entry point

```bash
# After Foundational checkpoint, kick off the parallel-safe leaves of Story 1:
Task: "T023 Define ExtractedCoffeeSchema in src/ai/schemas/extraction.ts"
Task: "T024 Define EXTRACTION_TOOL_DEFINITION in src/ai/prompts/extraction.ts"
Task: "T030 Implement Scanner component in src/components/Scanner.tsx"
Task: "T031 Implement ReviewCard component in src/components/ReviewCard.tsx"
Task: "T032 Implement ErrorState component in src/components/ErrorState.tsx"
Task: "T033 Implement ManualEntryForm in src/components/ManualEntryForm.tsx"

# Then sequentially:
Task: "T025 Implement extractCoffeeLabel in src/ai/client.ts (needs T023, T024)"
Task: "T034 Implement ScanView orchestration in src/views/ScanView.tsx (needs T025, T030–T033)"
Task: "T035 Wire #/scan route into App.tsx (needs T034)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Run the spec's Story 1 acceptance scenarios manually per `quickstart.md`. Record SC-001 timing on one bag.
5. **MVP merge candidate**: at this point, the app does the hero moment — capture → card. Closing the tab discards the coffee. That's an acceptable MVP for internal demo and user feedback, but not for shipping.

### Incremental Delivery

1. Phase 1 + Phase 2 → foundation ready, dev environment boots
2. Phase 1 + Phase 2 + Phase 3 → MVP: capture → card (in-session)
3. + Phase 4 → Usable library: capture → save → revisit
4. + Phase 5 → Discovery companion: capture → save → revisit → enrichment
5. + Phase 6 → Production-ready: starter scaffolding removed, verified, gates re-checked

### Single-developer linear path

The simplest path is to take phases 1 → 6 strictly in order. Each phase's checkpoint exit criterion is verifiable in under a minute.

---

## Notes

- **[P] tasks** = different files, no dependencies on incomplete tasks
- **[Story] label** maps each task to the specific user story it serves
- Constitution-mandated tests (AI schemas, golden fixtures, store CRUD) are included; UI component tests are NOT in scope for v1
- Verify the **mobile viewport rule (Principle III)** at every UI touchpoint; the quickstart's iPhone 14 Pro emulation is the standard check
- Constitution Principle II — never persist or render free-text AI output into structured slots. The tool-use + Zod boundary in T017 + T025 + T046 is the only path AI output reaches the user
- Commit after each task or logical group; do NOT bundle starter-scaffolding deletion (T052) with new-code commits — keep the deletion isolated for clean review
- **Stop at any phase checkpoint** to validate the feature increment independently
- Avoid: adding model calls beyond the two specified (extract + enrich); using `localStorage`; using `dangerouslySetInnerHTML`; loading any third-party script (all would violate the constitution)
