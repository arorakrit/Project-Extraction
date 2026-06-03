# Contract: `drinks` Store API & Routes

This feature exposes **no external/network API** (local-first, no AI call). The contracts that
matter are (1) the public surface of `src/store/drinks.ts` consumed by the views/components, and
(2) the hash routes added to `App.tsx`. Both are stable interfaces other modules and tests depend
on.

## 1. Types

```ts
// src/lib/flavours.ts
export type FlavourTag =
  | 'fruity' | 'floral' | 'chocolatey' | 'nutty' | 'bright' | 'heavy'
export const FLAVOUR_TAGS: readonly FlavourTag[]          // palette order
export const FLAVOUR_LABELS: Record<FlavourTag, string>   // display labels
export const MAX_FLAVOUR_TAGS = 3

// src/store/drinks.ts
export type Process = 'washed' | 'natural' | 'honey'
export type RoastLevel = 'light' | 'medium' | 'dark'

export interface DrinkLog {
  id: string
  logged_at: string                 // ISO 8601
  rating: 1 | 2 | 3 | 4 | 5
  coffee_name: string | null
  venue: string | null
  origin_country: string | null
  process: Process | null
  roast_level: RoastLevel | null
  flavour_tags: FlavourTag[]        // 0–3, unique, palette-only
  schema_version: 1
}

/** Caller-supplied fields; id/logged_at/schema_version are assigned by makeDrinkLog. */
export interface DrinkInput {
  rating: number                    // validated to 1–5
  coffee_name?: string | null
  venue?: string | null
  origin_country?: string | null
  process?: Process | null
  roast_level?: RoastLevel | null
  flavour_tags?: FlavourTag[]
}
```

## 2. Functions

```ts
/**
 * Pure factory + validator. Assigns id (crypto.randomUUID), logged_at (now, ISO),
 * schema_version (1). Trims strings, maps empty → null, clamps lengths.
 * THROWS if rating is not an integer in [1,5], or if flavour_tags is >3 items,
 * has duplicates, or contains a non-palette value, or if process/roast_level is
 * an unrecognized non-null value.
 */
export function makeDrinkLog(input: DrinkInput): DrinkLog

/** Persists a DrinkLog. Throws if schema_version !== 1. */
export function addDrink(entry: DrinkLog): Promise<void>

/** Returns the record or null. Throws StaleDrinkSchemaError on unknown schema_version. */
export function getDrink(id: string): Promise<DrinkLog | null>

/** All drinks, schema_version===1 only, sorted by logged_at DESCENDING (newest first). */
export function listDrinks(): Promise<DrinkLog[]>

/** Removes a drink. No-op if absent. */
export function deleteDrink(id: string): Promise<void>

/**
 * Distinct, trimmed, non-null venue strings across all drinks, de-duplicated
 * case-insensitively (first-seen casing kept), ordered most-recent logged_at first.
 */
export function listVenues(): Promise<string[]>

export class StaleDrinkSchemaError extends Error {}  // mirrors StaleSchemaError / StaleBrewSchemaError
```

### Behavioural guarantees (test targets)

| ID  | Guarantee |
|-----|-----------|
| C-01 | `makeDrinkLog({ rating: 4 })` yields a valid `DrinkLog` with `flavour_tags: []`, all optionals `null`, a UUID `id`, ISO `logged_at`, `schema_version: 1`. |
| C-02 | `makeDrinkLog` throws for `rating` of `0`, `6`, `3.5`, or non-number. |
| C-03 | `makeDrinkLog` throws when `flavour_tags` has 4 items, duplicates, or a non-palette value. |
| C-04 | Empty/whitespace `venue`/`coffee_name`/`origin_country` normalize to `null`; non-empty are trimmed. |
| C-05 | `addDrink` → `listDrinks` returns the entry; multiple entries come back newest-first by `logged_at`. |
| C-06 | `listVenues` returns each distinct venue once (case-insensitive), excludes nulls, newest-first; logging a new free-typed venue makes it appear on the next call. |
| C-07 | `deleteDrink` removes only the targeted record. |
| C-08 | Reading a record with an unknown `schema_version` throws `StaleDrinkSchemaError`; such records are filtered out of `listDrinks`. |
| C-09 | Opening the DB upgrades v2 → v3 creating `drinks` without disturbing existing `coffees`/`brews`/`settings` data. |

## 3. Routes (App.tsx hash router)

| Route        | View            | Contract |
|--------------|-----------------|----------|
| `#/log`      | `DrinkLogView`  | Renders the logging form. Save is enabled only once a rating is set; on save, calls `makeDrinkLog` → `addDrink`, then navigates to `#/drinks`. Cancel/back returns without writing. |
| `#/drinks`   | `DrinksView`    | Lists `listDrinks()` newest-first via `DrinkCard`; shows an empty state when none; offers a "Log a drink" affordance. |
| `#/scan` (home) | `ScanView`   | Gains a "Log a drink" entry point navigating to `#/log`. |
| (all primary surfaces) | FAB    | Persistent floating action button → `#/log`, in the thumb zone, ≥ 44×44. |

### UI behavioural guarantees (component test targets)

| ID  | Guarantee |
|-----|-----------|
| U-01 | Save is disabled / blocked until a star rating is selected; attempting to save with none surfaces the rating requirement and writes nothing. |
| U-02 | `FlavourTagPicker` toggles a tag on tap, deselects on re-tap, and refuses a 4th selection (caps at `MAX_FLAVOUR_TAGS`). |
| U-03 | `VenueInput` shows prior venues as suggestions filtered by prefix and accepts a free-typed value not in the list. |
| U-04 | Saving with only a rating succeeds and the new entry appears at the top of `#/drinks`. |
