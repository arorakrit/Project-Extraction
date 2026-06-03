# Phase 1 Data Model: Log a Drink

All entities are local-only (IndexedDB, store `project-extraction`). No AI output is involved, so
there is no Zod/tool-use schema — validation lives in the pure `makeDrinkLog` factory and the
`schema_version` guards (see [contracts/drinks-store.contract.md](./contracts/drinks-store.contract.md)).

## Entity: `DrinkLog`

The persisted record of one manually logged tasting. Stored in the new `drinks` object store,
`keyPath: 'id'`. Standalone — **no** foreign key to `coffees` or `brews`.

| Field            | Type                                                  | Req | Notes |
|------------------|-------------------------------------------------------|-----|-------|
| `id`             | `string`                                              | ✔   | UUID v4 via `crypto.randomUUID()`. Store key. |
| `logged_at`      | `string` (ISO 8601)                                   | ✔   | Time the drink was logged. Descending sort key for history. |
| `rating`         | `1 | 2 | 3 | 4 | 5`                                    | ✔   | The only user-required field. Integer 1–5. |
| `coffee_name`    | `string | null`                                       | —   | Free text, trimmed; empty → `null`; max 120 chars. |
| `venue`          | `string | null`                                       | —   | Café / roaster stand / event name, trimmed; empty → `null`; max 120 chars. Powers `listVenues()`. |
| `origin_country` | `string | null`                                       | —   | Free text, trimmed; empty → `null`; max 80 chars. |
| `process`        | `'washed' | 'natural' | 'honey' | null`               | —   | Single-tap selector. |
| `roast_level`    | `'light' | 'medium' | 'dark' | null`                  | —   | Single-tap selector. |
| `flavour_tags`   | `FlavourTag[]`                                        | ✔   | 0–3 items, unique, each from the fixed palette. Defaults to `[]`. |
| `schema_version` | `1`                                                   | ✔   | Record schema version, independent of `DB_VERSION`. |

### `FlavourTag` (fixed palette — `src/lib/flavours.ts`)

```text
'fruity' | 'floral' | 'chocolatey' | 'nutty' | 'bright' | 'heavy'
```

Display labels: Fruity · Floral · Chocolatey · Nutty · Bright · Heavy. The palette is fixed for
this feature; custom tags are out of scope (spec Assumptions).

### Validation rules (enforced by `makeDrinkLog`)

- `rating` MUST be an integer in `[1, 5]`; otherwise throw — this backstops the UI's
  rating-required gate (FR-002, edge case "No rating chosen").
- `flavour_tags` MUST have length ≤ 3, contain only palette values, and contain no duplicates;
  otherwise throw — backstops the picker's max-3 cap (FR-009, SC-007).
- `process` MUST be one of the three allowed values or `null`; `roast_level` one of its three or
  `null`.
- String fields are trimmed; an empty/whitespace-only string normalizes to `null`; values are
  clamped to their max length (no throw — long input is accepted up to the limit per the long
  free-text edge case).
- `id`, `logged_at`, `schema_version` are assigned by the factory, never accepted from caller input.

### Lifecycle / state

`DrinkLog` is **append-only** for this feature: created by `addDrink`, read by `getDrink` /
`listDrinks`, and removable by `deleteDrink`. There is no edit transition in scope (spec
Assumptions — editing may come later). No partial/derived "effective" merge exists (unlike
`coffees`/`brews`) because there is no immutable AI layer to override.

## Derived view: Venue suggestions

Not a stored entity. `listVenues()` computes the distinct set of non-null, trimmed `venue` values
across all `DrinkLog`s, de-duplicated case-insensitively (first-seen casing wins), ordered by most
recent `logged_at` first. The `VenueInput` component filters this by typed prefix; any typed value
is always accepted verbatim as a free-typed venue (FR-004/FR-005).

## Persistence & migration

- **Store**: `drinks`, `keyPath: 'id'`, no secondary index (history sort and venue derivation are
  in-memory — see research D2).
- **Migration**: `DB_VERSION` 2 → 3. New branch `if (oldVersion < 3) db.createObjectStore('drinks',
  { keyPath: 'id' })`, appended after the existing `coffees`/`settings` (v1) and `brews` (v2)
  branches. **Forward-only**; downgrade is impossible (an older build lacks the `drinks` store and
  would not see these records). Existing `coffees`/`brews`/`settings` data is untouched.
- **Offline**: All reads/writes are local; nothing on any path requires the network (Principle IV).

## Relationship to existing model

```text
coffees (001) ──< brews (002, by_coffee)        drinks (003)   ← standalone, no FK
```

`drinks` is a peer store. `deleteCoffee`'s brew-cascade is unaffected and unrelated.
