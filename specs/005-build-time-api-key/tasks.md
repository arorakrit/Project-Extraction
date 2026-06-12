# Tasks: Build-Time API Key with BYOK Fallback

**Input**: Design documents from `/specs/005-build-time-api-key/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/key-resolution.md, quickstart.md

**Tests**: Included — the constitution (§3 Quality Gates) mandates unit tests for
deterministic logic, and contracts/key-resolution.md §4 enumerates the contract tests.
No golden-fixture tasks: no prompt/schema change (G2 N/A).

**Organization**: Tasks grouped by user story (US1 = zero-setup AI, US2 = personal
override, US3 = keyless build unchanged) so each story is independently implementable
and testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Committed env documentation and secret-hygiene baseline

- [X] T001 [P] Create `.env.example` at repo root: `VITE_ANTHROPIC_KEY=sk-ant-your-key` placeholder plus the normative warning from contracts/key-resolution.md §1 (key ships in the bundle; personal/private builds only; never set in Vercel/CI; prefer a dedicated spend-limited key) (FR-007)
- [X] T002 [P] Verify secret hygiene baseline: `git check-ignore .env` prints `.env`, `.env` is untracked (`git ls-files .env` empty), and the SC-003 scan from quickstart.md finds no key material in tracked files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The key-resolution module every story consumes

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create `src/lib/apiKey.ts`: export `KeySource`, `KeyResolution` (data-model.md), `getBuiltInApiKey()` (reads `import.meta.env.VITE_ANTHROPIC_KEY` at call time — research R5; trims; blank/whitespace → `null` — FR-009/R6), and `resolveApiKey()` (precedence personal via `getApiKey()` from `src/store/settings.ts` → built-in → none; `key` null ⇔ source `'none'`)
- [X] T004 Create `tests/unit/lib/apiKey.test.ts`: all five behaviour-table rows from contracts/key-resolution.md §2 using `vi.stubEnv('VITE_ANTHROPIC_KEY', …)` / `vi.unstubAllEnvs()` + fake-indexeddb for the personal-key rows

**Checkpoint**: `resolveApiKey()` contract proven — user stories can begin

---

## Phase 3: User Story 1 - Use AI features with zero key setup (Priority: P1) 🎯 MVP

**Goal**: A build carrying `VITE_ANTHROPIC_KEY` runs every AI flow with no Settings visit; Settings shows "built-in key active" without revealing the value; a rejected built-in key produces an actionable message.

**Independent Test**: quickstart.md "Verify — User Story 1": fresh browser profile on a key-bearing dev build → bag scan succeeds with zero key prompts; Settings shows built-in status, never the value.

### Implementation for User Story 1

- [X] T005 [US1] Modify `src/ai/client.ts`: replace `getApiKey()` with `resolveApiKey()` from `src/lib/apiKey.ts`; throw `MissingApiKeyError` only when `source === 'none'`; add `public readonly keySource: KeySource` to `ClaudeNetworkError` and populate it on every HTTP failure (FR-002, FR-008 plumbing; contracts §3)
- [X] T006 [US1] Update `tests/unit/ai/client.test.ts`: with stubbed env key and no personal key, `callClaudeTool` sends `x-api-key: <built-in>` (mock fetch) and does NOT throw `MissingApiKeyError`; a non-OK response yields `ClaudeNetworkError` with `keySource === 'built-in'`
- [X] T007 [P] [US1] Modify `src/views/ScanView.tsx`: pre-flight gate switches to `(await resolveApiKey()).source !== 'none'`; add error mapping `ClaudeNetworkError` + `status === 401` + `keySource === 'built-in'` → "This build's built-in key was rejected — add your own key in Settings." (FR-008)
- [X] T008 [P] [US1] Modify `src/views/CoffeeView.tsx`: same gating switch and 401-with-built-in error mapping as T007 (FR-008)
- [X] T009 [US1] Modify `src/components/Settings.tsx`: on mount resolve the key source; when `'built-in'` and no personal key, render a status line that a built-in key is active and that saving a personal key overrides it; NEVER render any part of the built-in value; Clear button remains personal-key-only (FR-005; contracts §3)
- [X] T010 [US1] Create `tests/unit/components/settings.test.tsx`: built-in state renders the status line; the stubbed built-in key value appears nowhere in the DOM; Clear button absent when only the built-in key is active

**Checkpoint**: Key-bearing build = zero-setup AI, fully demoable (MVP)

---

## Phase 4: User Story 2 - Override with a personal key (Priority: P2)

**Goal**: A saved personal key always wins; clearing it falls back to the built-in key (not a broken state); existing BYOK users see zero change.

**Independent Test**: quickstart.md "Verify — User Story 2": save an invalid personal key on a key-bearing build → AI action fails with 401 naming *your* key (proves precedence); clear it → next action succeeds via built-in.

### Implementation for User Story 2

- [X] T011 [US2] Modify `src/components/Settings.tsx`: re-run key-source resolution after `handleSave` and `handleClear` so the indicator transitions personal ↔ built-in/none correctly (FR-003, FR-004)
- [X] T012 [US2] Extend `tests/unit/components/settings.test.tsx`: after saving a key with the env key stubbed, indicator shows the personal state; after Clear, indicator returns to built-in state (and to today's copy when env is unset)
- [X] T013 [US2] Extend `tests/unit/ai/client.test.ts`: with BOTH a personal key (fake-indexeddb) and a stubbed env key, the request carries the personal key and a non-OK response yields `keySource === 'personal'` (FR-003; spec edge case: invalid personal key must not silently fall back)

**Checkpoint**: Precedence and fallback proven; US1 behaviour unchanged

---

## Phase 5: User Story 3 - Builds without a built-in key behave as today (Priority: P3)

**Goal**: A clean clone with no `.env` builds and runs exactly like the pre-005 app — same missing-key message, same Settings copy, no built-in mentions.

**Independent Test**: quickstart.md "Verify — User Story 3": remove `.env`, fresh profile → scan shows the existing missing-key message; Settings reads as today; saving a personal key unblocks.

### Implementation for User Story 3

- [X] T014 [US3] Extend `tests/unit/components/settings.test.tsx`: with env unset (and with env blank/whitespace — FR-009), Settings renders today's copy verbatim with no built-in mention (FR-006)
- [X] T015 [US3] Extend `tests/unit/ai/client.test.ts`: with no personal key and env unset/blank, `callClaudeTool` throws `MissingApiKeyError` with the unchanged message (FR-006, FR-009)
- [ ] T016 [US3] Manual check per quickstart US3: keyless `npm run dev`, fresh profile → existing missing-key flow end-to-end, then save a personal key and confirm scan works (record result in PR description)

**Checkpoint**: All three stories independently verified

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Constitution quality gates and release hygiene

- [X] T017 [P] Run gates: `npm run typecheck`, `npm run lint`, `npm run test` — all green, zero changes to AI fixtures expected
- [X] T018 [P] Final SC-003 scan per quickstart.md ("no key in committed source") across all tracked files before opening the PR
- [ ] T019 Manual quickstart verification of US1 + US2 on a key-bearing dev build, including Settings at ≤ 430px viewport; attach mobile-viewport evidence (screenshot/note) to the PR description (Principle III)
- [ ] T020 PR description: link `specs/005-build-time-api-key/`, state calls-per-user-action unchanged and zero token-spend trend change (constitution cost audit), and include T016/T019 verification notes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — T001/T002 immediately, in parallel
- **Foundational (Phase 2)**: Independent of Phase 1; T003 → T004. **T003 blocks all user stories**
- **US1 (Phase 3)**: Needs T003. T005 → T006; T005 blocks T007/T008 (they consume `keySource`); T009 → T010
- **US2 (Phase 4)**: Needs T003 + T009 (T011 edits the same Settings flow); T013 needs T005
- **US3 (Phase 5)**: Needs T009 (T014 extends its test surface) + T005 (T015); T016 needs US1 view changes merged
- **Polish (Phase 6)**: After all desired stories

### Within-story ordering

- T005 (client) before T007/T008 (views consume `ClaudeNetworkError.keySource`)
- T009 (Settings implementation) before T010/T012/T014 (its tests)

### Parallel Opportunities

- T001 ‖ T002 (different files)
- T007 ‖ T008 (different view files, both after T005)
- T017 ‖ T018 (independent checks)
- After Phase 2: US1 is the critical path; US2/US3 are mostly test-extension work that can start as soon as T005/T009 land

---

## Implementation Strategy

**MVP = Phase 1 + 2 + 3 (US1)**: `.env.example`, `apiKey.ts` + tests, client/view/Settings
wiring. That alone delivers "open the app, scan a bag, zero setup" on a key-bearing build —
demoable and shippable.

**Incremental delivery**: US2 next (precedence proof — small: 1 Settings tweak + 2 test
extensions), then US3 (almost entirely test coverage of the no-op path), then Polish gates.
Single-developer feature; the parallel markers mainly shorten the US1 view edits.

---

## Notes

- No DB migration, no new dependencies, no AI fixture changes anywhere in this list
- `src/lib/apiKey.ts` is the only file allowed to read `import.meta.env.VITE_ANTHROPIC_KEY`
- The real `.env` already in the working tree stays untracked — never commit it (T002/T018 guard)
- Commit after each task or logical group; stop at any checkpoint to validate the story

---

## Implementation Notes (recorded during /speckit-implement, 2026-06-12)

- **Hermetic tests**: Vitest auto-loads the developer's `.env`, which leaked the real
  local key into the first test run. `vite.config.ts` now blanks `VITE_ANTHROPIC_KEY`
  in `test.env` (blank ≡ absent per FR-009); `vi.stubEnv` overrides per-test.
- `src/vite-env.d.ts` declares `VITE_ANTHROPIC_KEY?: string` on `ImportMetaEnv`.
- FR-008 surfaces via a new `built_in_key_rejected` reason in `ErrorState` (ScanView).
  CoffeeView enrichment failures stay silent per the 001 enrichment contract; only its
  key *gating* switched to `resolveApiKey()`.
- T013/T015 landed as part of the `client.test.ts` edit; T012/T014 as part of the new
  `settings.test.tsx` (7 tests). Full suite: 102/102 green; typecheck + lint clean.
