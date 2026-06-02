# Implementation Plan: Scan Bag to Coffee Card

**Branch**: `001-scan-bag-to-card` | **Date**: 2026-05-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-scan-bag-to-card/spec.md`

## Summary

Implement the hero capture-to-card flow as a mobile-first React + TypeScript + Vite
SPA. A user photographs a coffee bag (or picks a photo from gallery); the image is
sent to Claude `claude-sonnet-4-6` using **tool use** to force a structured label
extraction that is validated at runtime by a Zod schema. The reviewed card is saved
to **IndexedDB** (via the `idb` wrapper) as the device's source of truth, and a
second Claude call attempts enrichment (origin story, producer context, brew
recommendation) which is layered onto the saved record without overwriting user
edits. Every Claude call is instrumented (size, tokens, latency, model id) and
follows a max-1-retry strategy with a user-actionable failure message. The
Anthropic API key is **user-supplied** (BYOK), entered once via a Settings screen
and stored in IndexedDB — replacing the leaky bundled `VITE_ANTHROPIC_KEY` in the
starter code.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict mode), React 18.3, ECMAScript 2022

**Primary Dependencies**:
  - `react@^18.3`, `react-dom@^18.3` (already present)
  - `vite@^6.0` + `@vitejs/plugin-react@^4.3` (already present)
  - `typescript@^5.6`, `@types/react`, `@types/react-dom` (to add)
  - `zod@^3.23` — runtime schema validation (single source of truth for AI output types)
  - `zod-to-json-schema@^3.23` — derives the Claude tool's `input_schema`
    from the Zod object at module load; eliminates parallel shape maintenance
    (constitution Principle II)
  - `idb@^8` — minimal IndexedDB Promise wrapper (~2KB gzipped)
  - `vitest@^2`, `@testing-library/react@^16` — unit + component tests
  - `eslint@^9`, `@typescript-eslint/*` — linting

**Storage**: IndexedDB. Database `project-extraction` (version 1).
  Object stores: `coffees` (keyPath `id`), `settings` (keyPath `key`).
  No localStorage in the new code path (constitution Principle IV).

**Testing**:
  - Vitest for unit tests (`src/**/*.test.ts`)
  - React Testing Library for component tests
  - AI golden fixtures under `tests/ai-fixtures/extraction/` and
    `tests/ai-fixtures/enrichment/` — JSON pairs of (recorded model response,
    expected validated output) that re-run through the schema validator on every
    schema or prompt change (constitution Principle II)

**Target Platform**: Modern mobile browsers — iOS Safari 17+, Chrome on Android
  (Android 13+). Progressive enhancement to desktop browsers. PWA install
  manifest planned for a later feature (not in scope here).

**Project Type**: Single-page web application (Vite SPA). No backend in v1.

**Performance Goals**:
  - First populated coffee card visible **≤ 10 s** from photo capture on a 4G
    connection (matches SC-001 in the spec).
  - Coffee library page open **≤ 200 ms** offline (read from IndexedDB).
  - Initial bundle **≤ 250 KB gzipped** (mobile-friendly cold start).

**Constraints**:
  - All reads (library, individual coffee page) MUST work offline (Principle IV).
  - **Exactly 2 Claude calls per "add a coffee" interaction** — one extract, one
    enrich. The enrichment call is fire-and-forget after save; it does not block
    the user. Under the constitution's ≥ 3-calls-per-action threshold, so no
    Complexity Tracking entry required.
  - API key MUST NOT ship in committed source (Principle constitutional
    Tech Constraint on Secrets).
  - All AI output MUST pass Zod validation before persistence or UI render
    (Principle II).

**Scale/Scope**:
  - Single-user, single-device.
  - Up to ~1,000 saved coffees per device before the library page may need
    virtualization (v1 will render the full list — acceptable up to ~200).
  - 3 primary views (Scan / Library / Coffee Detail) + Settings.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluate every gate below. For each, mark `PASS`, `FAIL`, or `N/A` with a one-line
justification. A `FAIL` MUST be either resolved before proceeding or recorded in
`Complexity Tracking` with an explicit rationale for the deviation.

- **G1. Spec lineage (Principle I)** — **PASS**. `spec.md` exists, was authored
  via `/speckit-specify`. `/speckit-clarify` was effectively a no-op: the spec
  quality checklist passed 16/16 on first iteration with zero
  `[NEEDS CLARIFICATION]` markers, and every gap was filled with a documented
  assumption in the spec's **Assumptions** section that downstream
  `/speckit-clarify` can still revise.
- **G2. AI schema-first (Principle II)** — **PASS**. Two Claude calls in this
  plan (extraction, enrichment). Both go through Claude **tool use** with the
  tool's `input_schema` derived from the same Zod schema that validates the
  response at runtime — single source of truth in `src/ai/schemas/`. A starter
  golden fixture for each call is delivered under `tests/ai-fixtures/`.
- **G3. Mobile-first UX (Principle III)** — **PASS**. All views designed at
  ≤ 430 px first; touch targets ≥ 44×44 CSS px; capture, library navigation,
  and save are all reachable in one thumb-zone tap; no hover-only or
  right-click paths.
- **G4. Local-first persistence (Principle IV)** — **PASS**. Coffees and
  settings live in IndexedDB; all reads (library page, individual coffee page)
  are network-independent; enrichment is the only background network operation
  and is non-blocking.
- **G5. Observability & cost (Principle V)** — **PASS**. Every Claude call is
  routed through `src/ai/client.ts` which records image bytes (size only),
  output token count, latency, model id, and structured failure reason. Per-
  session token spend is exposed via a dev-only HUD. 1-retry-with-backoff is
  applied to schema-validation failures. **2 Claude calls per user action**,
  under the ≥ 3 threshold — no Complexity Tracking entry needed.
- **G6. Technology constraints** — **PASS**. Stack is React + TypeScript +
  Claude `claude-sonnet-4-6` + IndexedDB (the constitution's recommendation for
  Principle IV). Web Speech API is **not used** in this feature (it belongs to
  brew logging — separate spec). Meta-framework decision recorded: **Vite SPA**
  (see research.md Decision 1) — resolves `TODO(REACT_META_FRAMEWORK)` from the
  constitution's v1.0.0 Sync Impact Report. API key handling decision recorded:
  **BYOK via Settings → IndexedDB** (see research.md Decision 2) — resolves
  `TODO(API_KEY_HANDLING)`. Storage decision recorded: **IndexedDB via `idb`**
  (see research.md Decision 3) — resolves `TODO(STORAGE_TECHNOLOGY)`.

**Existing scaffolding deviations to fix during implementation** (called out
here so they don't slip through review — they will be enumerated as explicit
tasks by `/speckit-tasks`):

1. `lib/claude.js:2` uses model id `claude-sonnet-4-20250514`; constitution
   mandates `claude-sonnet-4-6`. Must be corrected.
2. `lib/claude.js` ships `VITE_ANTHROPIC_KEY` from build-time env into the
   browser bundle. This leaks the developer's key publicly. Must be replaced
   with the BYOK Settings flow.
3. `lib/claude.js` uses prompt-engineered JSON + `JSON.parse` with no schema
   validation. Must be replaced with tool-use + Zod validation.
4. `App.jsx` persists via `localStorage`. Must be replaced with IndexedDB.
5. All `.jsx`/`.js` files in the scaffold must migrate to `.tsx`/`.ts`.

## Project Structure

### Documentation (this feature)

```text
specs/001-scan-bag-to-card/
├── plan.md              # This file (/speckit-plan command output)
├── spec.md              # Feature specification (already authored)
├── research.md          # Phase 0 output (this command)
├── data-model.md        # Phase 1 output (this command)
├── quickstart.md        # Phase 1 output (this command)
├── contracts/           # Phase 1 output (this command)
│   ├── extraction.contract.md
│   └── enrichment.contract.md
├── checklists/
│   └── requirements.md  # Spec quality checklist (from /speckit-specify)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── ai/
│   ├── schemas/
│   │   ├── extraction.ts        # Zod schema + inferred TS type for label extraction
│   │   └── enrichment.ts        # Zod schema + inferred TS type for enrichment
│   ├── prompts/
│   │   ├── extraction.ts        # System + tool definition for record_coffee_label
│   │   └── enrichment.ts        # System + tool definition for record_coffee_enrichment
│   ├── client.ts                # Claude API wrapper: tool use + retry + telemetry
│   └── validate.ts              # Shared Zod-validation entry point (re-exports)
├── store/
│   ├── db.ts                    # idb wrapper, schema versioning, migrations
│   ├── coffees.ts               # CRUD: addCoffee, getCoffee, listCoffees, deleteCoffee
│   └── settings.ts              # Get/set Anthropic API key in IndexedDB
├── lib/
│   ├── image.ts                 # Client-side resize to ≤ 1568px, JPEG q85
│   ├── telemetry.ts             # Per-session token spend tracking (dev HUD)
│   └── retry.ts                 # 1-retry-with-backoff helper
├── components/
│   ├── Scanner.tsx              # Camera/gallery picker, in-progress states
│   ├── ReviewCard.tsx           # Editable card shown immediately after extraction
│   ├── CoffeeCard.tsx           # Read-only card on coffee detail page
│   ├── CoffeeList.tsx           # Library page item rendering
│   ├── Settings.tsx             # BYOK API key entry; dev token-spend HUD
│   ├── ErrorState.tsx           # "couldn't read the label" + retry/manual actions
│   └── ManualEntryForm.tsx      # Fallback path when extraction fails or no camera
├── views/
│   ├── ScanView.tsx
│   ├── LibraryView.tsx
│   ├── CoffeeView.tsx
│   └── SettingsView.tsx
├── App.tsx                      # Top-level router (hash-based, ~30 LOC)
└── main.tsx                     # ReactDOM entry

tests/
├── unit/
│   ├── ai/
│   │   ├── extraction-schema.test.ts
│   │   ├── enrichment-schema.test.ts
│   │   └── client.test.ts       # retry + telemetry behavior with mocked fetch
│   └── store/
│       └── coffees.test.ts      # CRUD via fake-indexeddb
└── ai-fixtures/
    ├── extraction/
    │   ├── ethiopia-yirgacheffe.input.json   # Recorded Claude tool_use response
    │   └── ethiopia-yirgacheffe.expected.json
    └── enrichment/
        └── ethiopia-yirgacheffe.expected.json

tsconfig.json
vite.config.ts                   # Migrated from vite.config.js
index.html                       # Mobile viewport meta tag + main.tsx reference
package.json                     # +TypeScript, Zod, idb, Vitest, ESLint deps
```

**Structure Decision**: Single project (Option 1) — a Vite SPA with a flat
`src/` tree organised by capability (`ai/`, `store/`, `lib/`, `components/`,
`views/`). No backend, no monorepo. The existing root-level `App.jsx`,
`main.jsx`, `components/`, `lib/`, `vite.config.js`, `index.html` are starter
scaffolding that will be migrated **into** this `src/` tree (with TS + schema
discipline added) during `/speckit-implement` — they are not deleted up front
but every one of them is replaced or moved.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations. The 2-Claude-calls-per-action figure (extract + enrich) is under
the ≥ 3 threshold from Principle V; no entry required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _none_    |            |                                     |
