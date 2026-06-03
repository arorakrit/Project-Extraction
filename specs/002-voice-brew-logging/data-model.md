# Data Model: Voice Brew-Logging

**Feature**: 002-voice-brew-logging
**Date**: 2026-06-02
**Storage**: IndexedDB `project-extraction`, **version 2**

This feature adds one new persisted entity (`BrewLogEntry`) and one new AI-output
shape (`StructuredBrew`). It does not modify the `SavedCoffee` shape from 001; it
adds a one-to-many relationship (one coffee → many brews) via a foreign key.

---

## Entity: `StructuredBrew` (AI output shape)

The validated output of the `structure_brew_note` Claude call. Lives as a Zod
schema in `src/ai/schemas/brew.ts` — the single source of truth for both the
Claude tool's `input_schema` (via `zod-to-json-schema`) and runtime validation
(constitution Principle II).

| Field          | Type              | Null? | Meaning |
|----------------|-------------------|-------|---------|
| `brew_method`  | `string`          | yes   | e.g. "V60", "AeroPress", "Espresso". `null` if not stated. |
| `dose_g`       | `number`          | yes   | Dry coffee dose in grams. `null` if not stated. |
| `water_g`      | `number`          | yes   | Brew water in grams. `null` if not stated. |
| `ratio`        | `number`          | yes   | Spoken ratio as water-parts-per-1 (e.g. `16` → 1:16). Fallback only; see derivation rule. `null` if not stated. |
| `grind`        | `string`          | yes   | Grind description/setting, e.g. "medium-fine", "20 clicks". `null` if not stated. |
| `water_temp_c` | `number`          | yes   | Water temperature in °C. `null` if not stated. |
| `total_time_s` | `number` (int)    | yes   | Total brew time in whole seconds. `null` if not stated. |
| `tasting_note` | `string`          | yes   | Free-text impression. For voice entries this captures the descriptive tail of the note. `null` if none. |

```ts
// src/ai/schemas/brew.ts
import { z } from 'zod'

export const StructuredBrewSchema = z.object({
  brew_method: z.string().nullable(),
  dose_g: z.number().nullable(),
  water_g: z.number().nullable(),
  ratio: z.number().nullable(),
  grind: z.string().nullable(),
  water_temp_c: z.number().nullable(),
  total_time_s: z.number().int().nullable(),
  tasting_note: z.string().nullable(),
})

export type StructuredBrew = z.infer<typeof StructuredBrewSchema>

/** True iff every field is null — routes to the "didn't catch that" UX (FR-008). */
export function isEmptyBrew(b: StructuredBrew): boolean {
  return (
    b.brew_method === null &&
    b.dose_g === null &&
    b.water_g === null &&
    b.ratio === null &&
    b.grind === null &&
    b.water_temp_c === null &&
    b.total_time_s === null &&
    b.tasting_note === null
  )
}
```

**Validation rules** (from the spec):
- Every field is independently nullable. Unmentioned parameters MUST be `null`,
  never fabricated (FR-005, constitution Principle II).
- `total_time_s` is a whole-second integer; the prompt instructs the model to
  convert spoken "two and a half minutes" → `150`.
- Numeric fields use domain-standard units (grams, °C, seconds) per the spec's
  Assumptions; unit interpretation happens in the prompt, not post-hoc.

---

## Entity: `BrewLogEntry` (persisted)

One brewing session for one coffee. Stored in the `brews` object store. Mirrors
the `SavedCoffee` provenance split: immutable AI output (`structured`) + user
overrides (`user_edits`).

| Field          | Type                        | Meaning |
|----------------|-----------------------------|---------|
| `id`           | `string`                    | UUID v4, client-generated via `crypto.randomUUID()`. Store keyPath. |
| `coffee_id`    | `string`                    | FK → `SavedCoffee.id`. Indexed (`by_coffee`). |
| `logged_at`    | `string`                    | ISO 8601 of when the brew was logged. Timeline sort key (descending). |
| `source`       | `'voice' \| 'manual'`       | How the entry was created. |
| `transcript`   | `string \| null`            | Raw recognized speech for voice entries; `null` for manual. Preserves the spoken note (Principle IV — no loss). |
| `structured`   | `StructuredBrew`            | AI's structured view. Immutable after `addBrew`. For manual entries this holds the user's first-pass values and `user_edits` stays empty. |
| `user_edits`   | `Partial<StructuredBrew>`   | User overrides applied on top of `structured`. |
| `schema_version` | `1`                       | Record schema version (independent of the DB version). |

```ts
// src/store/brews.ts
import type { StructuredBrew } from '@/ai/schemas/brew'

export type BrewUserEdits = Partial<StructuredBrew>

export interface BrewLogEntry {
  id: string
  coffee_id: string
  logged_at: string
  source: 'voice' | 'manual'
  transcript: string | null
  structured: StructuredBrew
  user_edits: BrewUserEdits
  schema_version: 1
}
```

**Relationships**:
- `BrewLogEntry.coffee_id` → `SavedCoffee.id` (many-to-one). Enforced by
  application code, not the store. A brew MUST always reference an existing
  coffee (spec Assumptions: no standalone brews in v1).
- **Cascade delete (FR-021)**: deleting a `SavedCoffee` MUST delete all its
  `BrewLogEntry` rows. Implemented by extending `deleteCoffee` to call
  `deleteBrewsForCoffee(id)` — both within reach of the same logical operation.

**Invariants**:
- `structured` is set once at `addBrew` and never mutated thereafter (mirrors the
  `extracted` invariant on coffees). All later changes go through `user_edits`.
- `effectiveBrew(entry)` = `user_edits` merged over `structured`, using
  `'field' in user_edits` presence checks (so an explicit `null` edit is
  honored), exactly as `effectiveExtractedCoffee` does for coffees.
- `schema_version` MUST be `1`; reads of any other version throw a
  `StaleBrewSchemaError` (parallels `StaleSchemaError` for coffees) rather than
  silently coercing.

---

## Derived value: brew ratio

Not stored as the primary; computed for display.

```ts
// src/lib/ratio.ts
/** Water-parts per 1 part coffee, rounded to 1 decimal. null if either side missing/invalid. */
export function deriveRatio(dose_g: number | null, water_g: number | null): number | null {
  if (dose_g === null || water_g === null) return null
  if (dose_g <= 0) return null
  return Math.round((water_g / dose_g) * 10) / 10
}
```

**Resolution rule** (FR-006, SC-008, spec edge case): the displayed ratio is
`deriveRatio(effective.dose_g, effective.water_g)` when both are present
(dose/water are authoritative); otherwise fall back to the `structured.ratio` /
`user_edits.ratio` value if the user/model stated one directly. A spoken ratio
that conflicts with a stated dose/water pair is overridden by the pair.

---

## Store module surface (`src/store/brews.ts`)

```ts
addBrew(entry: BrewLogEntry): Promise<void>            // refuses schema_version !== 1
getBrew(id: string): Promise<BrewLogEntry | null>      // throws StaleBrewSchemaError on bad version
listBrewsForCoffee(coffeeId: string): Promise<BrewLogEntry[]>  // via by_coffee index, sorted logged_at desc
updateBrew(id: string, partial: { user_edits?: BrewUserEdits }): Promise<void>  // structured is invariant
deleteBrew(id: string): Promise<void>
deleteBrewsForCoffee(coffeeId: string): Promise<void>  // used by coffee cascade delete
effectiveBrew(entry: BrewLogEntry): StructuredBrew     // pure merge helper
```

`updateBrew` intentionally exposes only `user_edits` — `structured`, `source`,
`transcript`, `coffee_id`, and `logged_at` are invariant after creation
(parallels `updateCoffee` not exposing `extracted`).

---

## IndexedDB migration (v1 → v2)

```ts
// src/store/db.ts  (DB_VERSION = 2)
export interface ProjectExtractionDB extends DBSchema {
  coffees: { key: string; value: unknown }          // unchanged from v1
  settings: { key: string; value: { key: string; value: unknown } }  // unchanged
  brews: {
    key: string
    value: BrewLogEntry
    indexes: { by_coffee: string }                  // on coffee_id
  }
}

// upgrade(db, oldVersion):
//   if (oldVersion < 1) { create coffees, settings }   // existing
//   if (oldVersion < 2) {
//     const brews = db.createObjectStore('brews', { keyPath: 'id' })
//     brews.createIndex('by_coffee', 'coffee_id')
//   }
```

**Migration properties**:
- **Forward-only**: a v1 database gains an empty `brews` store; no existing row is
  read or transformed. Downgrade is not supported (acceptable — additive only).
- **Idempotent guards**: the `oldVersion < N` ladder ensures a fresh install
  (oldVersion 0) creates all three stores, while a v1 install creates only
  `brews`.
- No data loss is possible since the migration only adds a store.

---

## State transitions (a single brew, voice path)

```text
[Coffee detail page]
      │ tap record
      ▼
[Listening] ──(Web Speech result)──► [Structuring] ──(structure_brew_note ok)──► [Review: editable StructuredBrew]
      │                                    │                                            │ tap Save
      │ recognition error / unavailable    │ call fails / offline                       ▼
      ▼                                    ▼                                    [addBrew → brews store]
[Manual form (empty)]            [Manual form (pre-filled w/ transcript)]               │
      │ fill + Save                         │ fill + Save                               ▼
      └───────────────► [addBrew → brews store] ◄───────────────────────────► [Timeline shows entry, newest first]

isEmptyBrew(structured) === true  ──►  "Didn't catch that — try again / enter by hand" (transcript recoverable)
```

All four entry shapes converge on the same `BrewLogEntry` written by `addBrew`
(FR-019: manual entries are equivalent in kind to voice entries).
