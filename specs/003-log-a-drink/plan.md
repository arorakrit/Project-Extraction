# Implementation Plan: Log a Drink

**Branch**: `003-log-a-drink` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/003-log-a-drink/spec.md`

## Summary

Add a fast, fully manual "Log a drink" flow for tasting coffees at cafés and events: a
prominent home-screen entry point plus a persistent floating action button open a form where the
user sets a 1–5 star rating (the only required field), optionally records a venue via type-ahead
(suggested from prior logs, free-type fallback), names the coffee with optional origin / process /
roast, and single-taps up to three flavour tags. Saving appends a **Drink Log** to a new local
drink history, viewable most-recent-first, with no account and full offline support.

Technically this is a **store + UI** feature with **no AI**. It adds a third IndexedDB object
store (`drinks`) alongside the existing `coffees` and `brews`, a `src/store/drinks.ts` module that
mirrors the established CRUD + `schema_version` patterns, a small set of mobile-first components
(star rating, venue type-ahead, flavour-tag picker), a logging view, and a drink-history view. No
Claude `claude-sonnet-4-6` call is introduced.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict), React 18.3

**Primary Dependencies**: React + React DOM, `idb` ^8 (IndexedDB wrapper). No new runtime
dependencies. Zod is present but **not** required here (it is reserved for AI output validation;
this feature has no AI output).

**Storage**: IndexedDB (local-first), database `project-extraction`. Adds a new `drinks` object
store; bumps `DB_VERSION` 2 → 3 with a forward-only migration.

**Testing**: Vitest + `@testing-library/react` + `fake-indexeddb`; `tsc --noEmit`; eslint.

**Target Platform**: Mobile-first web (browsers ≤ 430px viewport baseline); deployed as a static
Vite SPA.

**Project Type**: Single-project React + TypeScript SPA (existing `src/` layout).

**Performance Goals**: A rating-only log completes (tap entry → saved & visible in history) in
under 30 seconds of user time; all reads/writes are local and effectively instant at personal
scale.

**Constraints**: Offline-capable (no network on any path); no account/auth; 44×44 CSS-px minimum
touch targets; one-handed thumb-zone reachability for the entry point and FAB.

**Scale/Scope**: Single local user per device; drink history on the order of hundreds–low
thousands of entries (in-memory sort/dedup is appropriate, mirroring `listCoffees`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — still passing.*

- **G1. Spec lineage (Principle I)** — **PASS**. This plan references
  `specs/003-log-a-drink/spec.md` authored via `/speckit-specify`. `/speckit-clarify` was not run;
  it is optional and the spec contains zero `[NEEDS CLARIFICATION]` markers, with the one
  material design choice (standalone vs. linked to coffee cards) resolved explicitly in the spec's
  Assumptions section.
- **G2. AI schema-first (Principle II)** — **N/A**. This feature introduces **no** Claude
  `claude-sonnet-4-6` calls. All data is hand-entered by the user; nothing is model-generated, so
  there is no AI output schema, no runtime AI validation, and no `tests/ai-fixtures/` entry to add.
  (The constitution's free-text-into-structured-slots prohibition does not apply: user-typed text
  into user-owned fields is not model output.)
- **G3. Mobile-first UX (Principle III)** — **PASS**. All new surfaces are designed at ≤ 430px
  first. The "Log a drink" entry point and FAB sit in the thumb zone and reuse the existing
  `--touch-target-min` (44px) token; the star, tag, and process controls are single-tap. No
  desktop-only interaction is on any critical path.
- **G4. Local-first persistence (Principle IV)** — **PASS**. The new `drinks` IndexedDB store is
  the authoritative source of truth. All reads and writes are local; nothing on the logging or
  history path touches the network. The migration is versioned and forward-only (v2 → v3) with a
  downgrade-impossible note recorded in data-model.md.
- **G5. Observability & cost (Principle V)** — **N/A** (no Claude calls → no token/latency
  instrumentation to add; existing `src/lib/telemetry.ts` is untouched). The ≥ 3-calls-per-action
  rule is not triggered (0 calls).
- **G6. Technology constraints** — **PASS**. Stays entirely within React + TypeScript + IndexedDB.
  No backend, no new dependency, no model substitution. Not using Web Speech / Claude in this
  feature is permitted (manual entry is an explicitly allowed path).

**Result**: All applicable gates PASS; G2 and G5 are N/A by virtue of the feature having no AI
calls. No deviations → Complexity Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-log-a-drink/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── drinks-store.contract.md   # Phase 1 output — store API + DrinkLog shape
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── store/
│   ├── db.ts            # MODIFY: DB_VERSION 2 → 3; create `drinks` object store
│   └── drinks.ts        # NEW: DrinkLog entity, makeDrinkLog(), CRUD, listVenues()
├── lib/
│   └── flavours.ts      # NEW: FLAVOUR_TAGS palette + FlavourTag type + labels
├── components/
│   ├── StarRating.tsx       # NEW: reusable 1–5 star control (required-rating semantics)
│   ├── VenueInput.tsx       # NEW: type-ahead venue field over listVenues()
│   ├── FlavourTagPicker.tsx # NEW: single-tap palette, max-3 enforcement
│   ├── DrinkLogForm.tsx     # NEW: composes the fields; emits a DrinkInput
│   └── DrinkCard.tsx        # NEW: one history row
├── views/
│   ├── DrinkLogView.tsx     # NEW: hosts the form, performs save, route #/log
│   └── DrinksView.tsx       # NEW: drink history list, route #/drinks
└── App.tsx              # MODIFY: add #/log + #/drinks routes, "Drinks" nav tab, FAB,
                         #         and a "Log a drink" entry on the home (#/scan) surface

tests/
└── unit/
    ├── drinks.store.test.ts   # NEW: makeDrinkLog validation, CRUD, sort, listVenues dedup,
    │                          #      schema_version guard, DB v2→v3 migration
    ├── flavour-picker.test.tsx# NEW: single-tap select/deselect, hard cap at 3
    └── drink-log-form.test.tsx# NEW: rating-required save gating, free-type venue, optional fields
```

**Structure Decision**: Single-project React SPA — extend the existing `src/store`, `src/lib`,
`src/components`, `src/views` layout established by `001`/`002`. The `drinks` store is a sibling of
`coffees`/`brews`, not a child of either, reflecting the spec's standalone tasting-journal model.

## Complexity Tracking

> No Constitution Check violations. No entries.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
