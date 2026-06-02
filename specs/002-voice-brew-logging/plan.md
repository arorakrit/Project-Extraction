# Implementation Plan: Voice Brew-Logging

**Branch**: `002-voice-brew-logging` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-voice-brew-logging/spec.md`

## Summary

Add brew logging to an existing saved coffee. From a coffee's detail page the user
taps one button and speaks a natural brew note ("V60, eighteen in, three hundred
out, medium-fine, ninety-four degrees, two and a half minutes, bright and
floral"). The spoken note is transcribed in-browser via the **Web Speech API**
(`SpeechRecognition` / `webkitSpeechRecognition`) and the transcript is sent to
Claude `claude-sonnet-4-6` via **tool use** to produce a structured brew —
method, dose, water, ratio, grind, water temperature, total time, and a free-text
tasting note — validated at runtime by a Zod schema (single source of truth,
constitution Principle II). The reviewed entry is written to **IndexedDB** (a new
`brews` store, DB version bumped 1 → 2, indexed by `coffee_id`) and rendered in a
most-recent-first **timeline** on the coffee page; reads are fully offline. Every
field is tappable to edit. When speech recognition is unavailable, or when the
structuring call fails, the flow degrades to a **manual brew-entry form** —
pre-filled with the raw transcript when one exists — so a spoken note is never
lost. Exactly **one Claude call per brew log** (structuring); under the
constitution's ≥ 3-call threshold.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict mode), React 18.3, ECMAScript 2022 —
unchanged from 001.

**Primary Dependencies**:
  - All 001 dependencies remain (`react`, `vite`, `zod`, `zod-to-json-schema`,
    `idb`, `vitest`, `@testing-library/react`, `eslint`).
  - `@types/dom-speech-recognition@^0.0.4` (dev) — ambient TypeScript types for
    the Web Speech API, which is not fully covered by `lib.dom`. No runtime
    dependency is added; the Web Speech API is browser-native.
  - `fake-indexeddb` (already a 001 test dep) is reused for the brew store tests.

**Storage**: IndexedDB, database `project-extraction`, **version 2** (bumped from
1). New object store `brews` (keyPath `id`) with a single index `by_coffee` on
`coffee_id` for fetching one coffee's history. Forward-only migration in
`src/store/db.ts` adds the store in the `oldVersion < 2` branch; the existing
`coffees` and `settings` stores are untouched (constitution Principle IV —
versioned, forward-only).

**Testing**:
  - Vitest unit tests for the brew schema validator, the ratio helper, and the
    brew store CRUD (via `fake-indexeddb`).
  - One AI golden fixture under `tests/ai-fixtures/brew-structuring/` — a
    recorded `structure_brew_note` response replayed through the Zod validator
    (no live Claude call in tests), per constitution Principle II.
  - Speech-recognition wrapper is feature-detected and guarded; its availability
    branch is unit-testable by stubbing the global constructor.

**Target Platform**: Modern mobile browsers — Chrome on Android (full Web Speech
support), iOS Safari 17+ (Web Speech support is **partial/unreliable**; the
manual fallback is the guaranteed path there). Progressive enhancement to desktop.

**Project Type**: Single-page web application (Vite SPA). No backend in v1 —
unchanged.

**Performance Goals**:
  - Structured brew entry visible **≤ 10 s** after the user stops speaking, on a
    4G connection (matches SC-001).
  - Coffee detail page with full brew timeline renders **≤ 200 ms** offline (read
    from IndexedDB).
  - No measurable bundle-size regression beyond the ambient speech types (which
    are dev-only, zero runtime bytes).

**Constraints**:
  - All brew-history reads MUST work offline (Principle IV).
  - Voice capture and AI structuring both require network; offline, the manual
    form is the path. A failed structuring call MUST preserve the raw transcript
    (drop the user into the manual form pre-filled) — no data loss (Principle IV).
  - **Exactly 1 Claude call per brew-log action** (structuring). Under the ≥ 3
    threshold — no Complexity Tracking entry required.
  - All AI output MUST pass Zod validation before persistence or UI render
    (Principle II).

**Scale/Scope**:
  - Single-user, single-device. One coffee has many brews (one-to-many).
  - Up to a few hundred brews per coffee before the timeline might need
    virtualization; v1 renders the full list (acceptable at this scale).
  - Adds 1 new Claude call type, 1 new IndexedDB store, ~4 new components, and
    extends the existing Coffee detail view.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **G1. Spec lineage (Principle I)** — **PASS**. `spec.md` was authored via
  `/speckit-specify`; the requirements checklist passed 16/16 on first iteration
  with zero `[NEEDS CLARIFICATION]` markers, every gap filled by a documented
  assumption that `/speckit-clarify` can still revise. This plan references it.
- **G2. AI schema-first (Principle II)** — **PASS**. Exactly one new Claude call,
  `structure_brew_note`, via **tool use**. Its `input_schema` is derived at
  module load from the same Zod object (`StructuredBrewSchema` in
  `src/ai/schemas/brew.ts`) that validates the response at runtime — single
  source of truth. Unmentioned parameters are `null`, never fabricated. A starter
  golden fixture lands under `tests/ai-fixtures/brew-structuring/`.
- **G3. Mobile-first UX (Principle III)** — **PASS**. The record button is a
  thumb-zone, ≥ 44×44 CSS-px target reachable in one tap from the coffee page;
  the review form, timeline rows, and edit affordances are all touch-first with
  no hover-only or right-click paths. Verified at ≤ 430 px first.
- **G4. Local-first persistence (Principle IV)** — **PASS**. Brews live in the
  new IndexedDB `brews` store; the timeline and every entry render offline. The
  schema migration is forward-only (v1 → v2). A failed/offline structuring call
  preserves the raw transcript via the manual form — transcripts are not lost.
- **G5. Observability & cost (Principle V)** — **PASS**. The structuring call is
  routed through the existing `callClaudeTool` wrapper in `src/ai/client.ts`,
  emitting a `TelemetryRecord` (model id, latency, output tokens, status,
  retry). Telemetry is extended with `input_text_chars` for text-input calls
  (image bytes are `null` here). **1 Claude call per user action** — under the
  ≥ 3 threshold, no Complexity Tracking entry. Raw transcripts/audio are never
  logged (only character count).
- **G6. Technology constraints** — **PASS**. Stack stays within the
  constitution: React + TypeScript + Claude `claude-sonnet-4-6` + **Web Speech
  API** + IndexedDB. This is the feature the constitution anticipated for the
  Web Speech API (Section 2). Web Speech is feature-detected on first use with a
  clear non-blocking notice and a manual fallback — it is **not** a hidden hard
  dependency, exactly as the constitution requires. No new TODOs; the
  meta-framework / API-key / storage decisions were already resolved in 001.

**Existing-code touchpoints** (called out so they surface as explicit
`/speckit-tasks` items, not silent edits):

1. `src/store/db.ts` — bump `DB_VERSION` to `2`, add the `brews` store and
   `by_coffee` index in an `oldVersion < 2` migration branch. The
   `ProjectExtractionDB` `DBSchema` interface gains a `brews` entry.
2. `src/store/coffees.ts` `deleteCoffee` — extend to cascade-delete the coffee's
   brews in the same transaction (FR-021); a coffee's brews must not outlive it.
3. `src/lib/telemetry.ts` — add `'structure_brew_note'` to the `call` union and
   add an `input_text_chars: number | null` field for text-input calls.
4. `src/views/CoffeeView.tsx` — mount the brew timeline and the record/log entry
   point below the existing `CoffeeCard`.

## Project Structure

### Documentation (this feature)

```text
specs/002-voice-brew-logging/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (already authored)
├── research.md          # Phase 0 output (this command)
├── data-model.md        # Phase 1 output (this command)
├── quickstart.md        # Phase 1 output (this command)
├── contracts/           # Phase 1 output (this command)
│   └── brew-structuring.contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── ai/
│   ├── schemas/
│   │   └── brew.ts                # NEW: StructuredBrewSchema (Zod) + type + isEmptyBrew()
│   ├── prompts/
│   │   └── brew.ts                # NEW: tool name/description + user prompt for structure_brew_note
│   └── client.ts                  # MODIFIED: + structureBrewNote(transcript) → StructuredBrew
├── store/
│   ├── db.ts                      # MODIFIED: DB_VERSION 2, brews store + by_coffee index
│   ├── brews.ts                   # NEW: addBrew, getBrew, listBrewsForCoffee,
│   │                              #      updateBrew, deleteBrew, deleteBrewsForCoffee,
│   │                              #      effectiveBrew()
│   └── coffees.ts                 # MODIFIED: deleteCoffee cascades to brews (FR-021)
├── lib/
│   ├── speech.ts                  # NEW: Web Speech API wrapper + isSpeechRecognitionAvailable()
│   ├── ratio.ts                   # NEW: deriveRatio(dose_g, water_g) → number | null
│   └── telemetry.ts               # MODIFIED: + 'structure_brew_note' call, input_text_chars
├── components/
│   ├── BrewRecorder.tsx           # NEW: one-tap record button; listening/structuring states
│   ├── BrewReview.tsx             # NEW: editable structured entry shown post-capture
│   ├── BrewTimeline.tsx           # NEW: most-recent-first history list + empty state
│   └── BrewEntryForm.tsx          # NEW: manual entry / edit form (shared by manual + edit)
├── views/
│   └── CoffeeView.tsx             # MODIFIED: mount BrewTimeline + BrewRecorder entry point
└── ...                            # (all other 001 files unchanged)

tests/
├── unit/
│   ├── ai/
│   │   └── brew-schema.test.ts    # NEW: StructuredBrew validation + isEmptyBrew + fixture replay
│   ├── store/
│   │   └── brews.test.ts          # NEW: CRUD + by_coffee query + cascade delete (fake-indexeddb)
│   └── lib/
│       └── ratio.test.ts          # NEW: deriveRatio rounding/edge cases
└── ai-fixtures/
    └── brew-structuring/
        └── v60-ethiopia/
            ├── input.transcript.json    # the raw spoken text used (no audio bytes)
            ├── recorded-response.json   # captured Claude tool_use response
            └── expected-output.json     # post-validation StructuredBrew
```

**Structure Decision**: Single project (Option 1) — extends the existing Vite SPA
`src/` tree from 001 by capability. No new top-level structure; brew logging slots
into the established `ai/ · store/ · lib/ · components/ · views/` layout and reuses
the 001 Claude wrapper, telemetry ring, retry helper, and IndexedDB connection.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The 1-Claude-call-per-action figure (structure_brew_note) is well
under the ≥ 3 threshold from Principle V; no entry required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _none_    |            |                                     |
