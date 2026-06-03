# Phase 0 Research: Log a Drink

The constitution fixes the stack (React + TypeScript + IndexedDB) and this feature adds **no**
Claude calls, so there are no open technology unknowns and **no `[NEEDS CLARIFICATION]` markers** to
resolve. The decisions below are design choices made within the fixed stack, recorded for lineage.

---

## D1. Standalone `drinks` store vs. reusing `coffees`/`brews`

- **Decision**: Introduce a new, independent `drinks` IndexedDB object store and a `DrinkLog`
  entity. Do not write through `coffees` or `brews`.
- **Rationale**: The spec frames a logged drink as a lightweight tasting at a café/event (e.g. "WoC
  Brussels"), distinct from an owned/scanned bag (`coffees`, `001`) and a home brew (`brews`, `002`).
  Reusing `coffees` would force a fake "card" per tasting and pollute the Library; reusing `brews`
  would require a parent `coffee_id` that does not exist here. A sibling store keeps each domain's
  invariants clean and matches the spec's Assumptions section.
- **Alternatives considered**:
  - *Reuse `coffees` with a `kind` discriminator* — rejected: blurs two different mental models and
    complicates `listCoffees`/Library which assume bag-derived cards.
  - *Reuse `brews` with a synthetic parent coffee* — rejected: violates the `brews.by_coffee` FK
    contract and the cascade-delete semantics.

## D2. IndexedDB schema migration

- **Decision**: Bump `DB_VERSION` from 2 to 3 and create the `drinks` store (`keyPath: 'id'`) inside
  a `if (oldVersion < 3)` branch, appended to the existing forward-only `upgrade` ladder in
  `src/store/db.ts`. No secondary index.
- **Rationale**: Mirrors exactly how `002` added `brews` (`oldVersion < 2`). History is read via
  `getAll` + in-memory descending sort on `logged_at`, identical to `listCoffees`; at personal scale
  (hundreds–low thousands of rows) this is simpler and just as fast as an index. Venue suggestions
  are likewise derived in memory (see D4), so no `by_venue` index is needed.
- **Alternatives considered**:
  - *Add a `by_logged_at` index* — rejected as premature; `getAll` + sort is the established
    pattern and the data volume does not warrant an index.
  - *A `by_venue` index for suggestions* — rejected: distinct-venue derivation in memory is
    trivial at this scale and avoids index-maintenance complexity.

## D3. Validation without Zod

- **Decision**: Validate the drink in a pure `makeDrinkLog(input)` factory in `src/store/drinks.ts`
  (assigns `id`, `logged_at`, `schema_version`; normalizes/clamps fields; throws on invalid
  rating or tag-set), plus the `schema_version` write/read guards used by `coffees`/`brews`. Do not
  pull in Zod.
- **Rationale**: Zod in this codebase is dedicated to validating *AI* output (Principle II). This
  feature has no AI output — the data is user-entered into user-owned fields. A small, fully
  unit-tested pure factory matches the existing store style (plain TS interfaces + `schema_version`
  guard) and keeps the bundle lean.
- **Alternatives considered**:
  - *A Zod schema for the form* — rejected: adds a parallel validation surface for no
    Principle-II benefit; the constitution scopes schema-first to model output.

## D4. Venue type-ahead source

- **Decision**: Derive suggestions from the user's own prior logs. `listVenues()` returns the
  distinct, non-empty, trimmed venue strings across all `DrinkLog`s (case-insensitive de-dup,
  ordered most-recent-first); the `VenueInput` component filters this list by the typed prefix and
  always allows the typed value to stand as a free-typed venue.
- **Rationale**: Local-first, no backend, no external venue API (Principle IV; spec Assumptions).
  This satisfies SC-005 (a prior venue surfaces within three typed characters) with zero network.
- **Alternatives considered**:
  - *External venue/places API* — rejected: violates local-first and adds a network dependency and
    a key.
  - *A curated bundled venue list* — rejected: events/stands are too long-tail; user history is the
    right and self-improving source.

## D5. Venue input control: native `<datalist>` vs. custom dropdown

- **Decision**: Use a controlled `<input>` backed by a native `<datalist>` of `listVenues()`
  results, with free-typing always permitted.
- **Rationale**: Zero-dependency, accessible, mobile-keyboard-friendly, and inherently supports the
  "free-type if not found" requirement (FR-004) since a `datalist` never constrains input. Keeps us
  within the no-new-deps constraint.
- **Alternatives considered**:
  - *Custom popover list* — deferred: more control over styling but more code and a11y surface; the
    native control meets all acceptance scenarios for v1.

## D6. Surfacing drink history & entry points in navigation

- **Decision**: Add a `#/drinks` history view as a fourth bottom-nav tab ("Drinks"), a `#/log`
  route for the form, a "Log a drink" button on the home (`#/scan`) surface, and a persistent
  floating action button rendered by `App` across primary surfaces, all navigating to `#/log`.
- **Rationale**: Satisfies FR-001 (home entry **and** FAB) and Principle III thumb-zone
  reachability. A dedicated tab keeps the tasting journal distinct from the coffee Library (D1) and
  is reachable in one tap. Hash routing matches the existing `App.tsx` router.
- **Alternatives considered**:
  - *Fold drink history into the Library tab* — rejected: conflates standalone tastings with
    bag-derived coffee cards (contradicts D1).
  - *FAB only, no home button* — rejected: FR-001 explicitly requires both.

## D7. `roast_level` and `process` as constrained selectors

- **Decision**: Model `process` as `'washed' | 'natural' | 'honey' | null` and `roast_level` as
  `'light' | 'medium' | 'dark' | null`, presented as single-tap segmented selectors.
- **Rationale**: The spec enumerates the three processes explicitly; a tap selector beats free text
  for speed (SC-001/002) and keeps history values consistent. Roast is given a conventional
  three-level scale for the same reason; left fully optional.
- **Alternatives considered**:
  - *Free-text process/roast* — rejected: slower and produces inconsistent history values.

---

**Output**: No unknowns remain. All decisions stay within the constitution's stack; G2/G5 are N/A
(no AI calls). Proceed to Phase 1.
