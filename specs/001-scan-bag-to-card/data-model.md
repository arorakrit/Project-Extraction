# Phase 1 Data Model: Scan Bag to Coffee Card

**Feature**: 001-scan-bag-to-card
**Date**: 2026-05-31

This document captures the runtime types and persistence shapes for the feature.
All TypeScript types shown here are the inferred output of the corresponding Zod
schemas in `src/ai/schemas/` — the Zod object is the single source of truth
(Principle II). Storage shapes are stable contracts; any change ships with an
IndexedDB version bump and a migration.

---

## Entity overview

| Entity              | Lives in                  | Created when                          |
|---------------------|---------------------------|---------------------------------------|
| `ExtractedCoffee`   | In-memory after AI call   | Vision extraction succeeds            |
| `EnrichedCoffee`    | In-memory after AI call   | Enrichment call succeeds              |
| `UserEditedFields`  | In-memory after review    | User edits a field on the review card |
| `SavedCoffee`       | IndexedDB `coffees` store | User taps Save on the review card     |
| `AppSettings`       | IndexedDB `settings` store | First app launch / Settings save     |
| `TelemetryRecord`   | In-memory (dev HUD only) | Every Claude call                     |

---

## `ExtractedCoffee` — the vision-call output

Shape returned by the `record_coffee_label` tool, validated by
`src/ai/schemas/extraction.ts`.

```ts
// src/ai/schemas/extraction.ts
import { z } from 'zod'

export const ExtractedCoffeeSchema = z.object({
  roaster_name:    z.string().nullable(),
  coffee_name:     z.string().nullable(),
  origin_country:  z.string().nullable(),
  origin_region:   z.string().nullable(),
  variety:         z.string().nullable(),
  process:         z.string().nullable(),
  roast_level:     z.string().nullable(),
  tasting_notes:   z.array(z.string()),       // empty array if none; never null
})
export type ExtractedCoffee = z.infer<typeof ExtractedCoffeeSchema>
```

**Field semantics**:
- Every scalar field is `string | null`. `null` means **the model could not
  read this field with confidence from the photo** — it does NOT mean "field
  absent from the label." We do not distinguish those two cases in v1 because
  the user-visible action ("fill it in if you want") is identical.
- `tasting_notes` is always an array. Empty array = no tasting notes found.
- No field is required to be non-null. A successful extraction with every
  field null and `tasting_notes: []` is **legal** and represents the
  total-failure case — it triggers the failure UX (FR-007) rather than
  rendering an empty card.

**Validation rules**:
- `ExtractedCoffeeSchema.parse(toolUse.input)` MUST succeed or the call is
  retried once (per research.md Decision 7).
- After parse: if every scalar is `null` AND `tasting_notes.length === 0`,
  `ai/client.ts` throws `ExtractionEmptyError` and the Scanner view shows
  ErrorState (FR-007). This is logic, not a schema rule — the schema
  intentionally permits this shape.

---

## `EnrichedCoffee` — the enrichment-call output

Shape returned by the `record_coffee_enrichment` tool, validated by
`src/ai/schemas/enrichment.ts`.

```ts
// src/ai/schemas/enrichment.ts
import { z } from 'zod'

export const BrewRecommendationSchema = z.object({
  method:        z.string(),                  // e.g. "V60 pourover"
  ratio:         z.string(),                  // e.g. "1:16"
  grind:         z.string(),                  // e.g. "medium-fine"
  temperature_c: z.number().int().nullable(),
  notes:         z.string().nullable(),
})

export const EnrichedCoffeeSchema = z.object({
  origin_story:        z.string().nullable(),   // 1–3 sentences or null
  producer_context:    z.string().nullable(),   // farm/co-op details or null
  brew_recommendation: BrewRecommendationSchema.nullable(),
})
export type EnrichedCoffee = z.infer<typeof EnrichedCoffeeSchema>
```

**Field semantics**:
- Every top-level field is nullable so the model can honestly answer "no
  reliable info" (constitution Principle II: "never fabricate").
- `brew_recommendation` is a single object, not an array. v1 surfaces one
  starting-point recommendation; multiple variants is a future enhancement.

---

## `UserEditedFields` — the review-screen overrides

```ts
// src/store/coffees.ts (alongside SavedCoffee)
export type UserEditedFields = Partial<ExtractedCoffee>
```

**Semantics**:
- The review card is editable (FR-006). When the user edits a field, the
  edited value is written into `UserEditedFields`, not into
  `ExtractedCoffee`. This preserves "what the AI saw" vs "what the user
  said" for future analysis (e.g., extraction-accuracy measurement against
  SC-002).
- For display, the effective value of a field is
  `userEdits[field] ?? extracted[field]`.
- `tasting_notes` is handled as a full-array replacement, not per-element
  merge, when the user edits.

---

## `SavedCoffee` — the IndexedDB persistence shape

```ts
// src/store/coffees.ts
export interface SavedCoffee {
  /** UUID v4; client-generated via crypto.randomUUID(). */
  id: string

  /** ISO 8601 timestamp of the capture (not the save). */
  captured_at: string

  /**
   * Resized JPEG as data URL ("data:image/jpeg;base64,..."). Null when the
   * coffee was entered manually with no photo source.
   */
  source_image_data_url: string | null

  /** AI's view of the label. Immutable after save. */
  extracted: ExtractedCoffee

  /** User's overrides applied on top of `extracted`. */
  user_edits: UserEditedFields

  /** Populated by the post-save enrichment call. Null until then. */
  enriched: EnrichedCoffee | null

  /** ISO 8601 timestamp of last enrichment attempt; null if never tried. */
  enrichment_attempted_at: string | null

  /** Schema version of this record. Currently 1. */
  schema_version: 1
}
```

**Identity & uniqueness**: `id` is the key. **v1 does not detect duplicates**
(spec Assumption). Saving the same bag twice yields two records.

**State transitions**:

```text
        (vision call returns valid schema)
[New] ──────────────────────────────────────→ [Extracted]
                                                    │
                                  (user edits fields)
                                                    ▼
                                              [Reviewed]
                                                    │
                                       (user taps Save)
                                                    ▼
   [Deleted] ←────── (user deletes) ────── [Saved] ───── (enrichment finishes)
                                                    └──→ [Enriched]
```

- `New → Extracted`: triggered by successful vision call + schema parse.
- `Extracted → Reviewed`: an in-memory state; no persistence yet.
- `Reviewed → Saved`: `addCoffee(coffee)` writes the IndexedDB record.
- `Saved → Enriched`: enrichment call succeeds and `enriched` is set via
  `updateCoffee(id, { enriched, enrichment_attempted_at })`.
- `Saved/Enriched → Deleted`: hard delete via `deleteCoffee(id)`. No
  tombstone — brew-log retention is a concern for the brew-log feature, not
  this one.

**Invariants enforced by `src/store/coffees.ts`**:
1. `extracted` is never written to after the initial `addCoffee`. Updates
   only touch `user_edits`, `enriched`, and `enrichment_attempted_at`.
2. `enriched` is additive only — `enrichment_attempted_at` is bumped on every
   attempt, but `enriched` itself is only written when the call succeeds.
3. `schema_version` is set on write and checked on read; mismatches trigger
   a migration step (none in v1 — only one version exists).

---

## `AppSettings` — IndexedDB `settings` store

Key/value rows in the `settings` object store.

| key                  | value type | meaning                                    |
|----------------------|------------|--------------------------------------------|
| `anthropic_api_key`  | `string`   | User-supplied Anthropic API key (BYOK)     |
| `schema_version`     | `1`        | Reserved for cross-feature migrations      |

The `anthropic_api_key` row is the **only** secret in the entire app.
`Settings.tsx` (the view) writes and reads it; no other component reads it
directly — only `src/ai/client.ts` fetches it on demand inside each call.

---

## `TelemetryRecord` — per-call instrumentation (dev only)

```ts
// src/lib/telemetry.ts
export interface TelemetryRecord {
  call: 'extract_coffee_label' | 'enrich_coffee_profile'
  model_id: 'claude-sonnet-4-6'
  status: 'ok' | 'retry_then_ok' | 'schema_error' | 'network_error'
  latency_ms: number
  input_image_bytes: number | null    // null for enrichment (no image)
  output_tokens: number | null         // from `usage` block if present
  retried: boolean
  ts: string                           // ISO 8601
}
```

Records are held in a session-scoped ring buffer (last 100). The dev HUD
renders the aggregate token count and lists individual entries. **No
records persist to IndexedDB** — production builds should still emit
telemetry (size-only image bytes; no PII) but storage / surfacing is out of
scope for v1.

**Privacy invariant** (Principle V): No record ever contains image pixel
data, the raw model response text, the API key, or the user's edits.

---

## Mapping back to spec entities

| Spec entity (spec.md "Key Entities") | This document's representation                 |
|--------------------------------------|------------------------------------------------|
| Coffee Card                          | `SavedCoffee` rendered through `CoffeeCard.tsx`; the "effective field" merge of `extracted ⊕ user_edits ⊕ enriched` is computed at render time, not stored. |
| Saved Coffee                         | A row in the IndexedDB `coffees` object store. |
| Extraction Result                    | `ExtractedCoffee` + the `ExtractionEmptyError` failure path. |
| Enrichment Result                    | `EnrichedCoffee`; `null` when enrichment has not (yet) succeeded. |

---

## Indexes & query patterns (v1)

The library page lists coffees newest-first. v1 implementation: read all
records via `getAll()` and sort in-memory by `captured_at` desc. At ≤ 200
records this is well under one frame. No secondary indexes are added in v1.

A `by_captured_at` index will be added when (a) record count nears 1,000 or
(b) we ship cross-filter UI — whichever comes first. Both are out of scope.
