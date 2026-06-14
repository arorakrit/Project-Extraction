# Data Model: Café-First Drink Logging with Voice Capture

**Feature**: `006-cafe-voice-drink-logging` | **Date**: 2026-06-12

## Overview

**No persisted-schema changes.** IndexedDB stays at `DB_VERSION 3`; the
`drinks` store and the `DrinkLog` record (`schema_version: 1`) are unchanged.
This feature adds one **transient** entity (the voice draft), two derived
read paths over existing data, and re-weights presentation.

```text
  spoken description ──Web Speech──▶ transcript (string, in-memory)
                                         │ structure_drink_note (1 Claude call)
                                         ▼
                              VoiceDrinkDraft (transient, validated + normalized)
                                         │ prefills café-first form (review)
                                         ▼ user edits + explicit Save
                              DrinkInput ──makeDrinkLog()──▶ DrinkLog (persisted, unchanged)
```

## Entities

### DrinkLog (existing — UNCHANGED)

Defined in `src/store/drinks.ts`. Reproduced for reference only:

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID v4) | store keyPath |
| `logged_at` | ISO 8601 string | history sort key, descending |
| `rating` | `1‥5` | only required user field |
| `coffee_name` | `string \| null` | ≤ 120 chars, trimmed |
| `venue` | `string \| null` | ≤ 120 chars, trimmed — **now the presentation headline** |
| `origin_country` | `string \| null` | ≤ 80 chars |
| `process` | `'washed' \| 'natural' \| 'honey' \| null` | |
| `roast_level` | `'light' \| 'medium' \| 'dark' \| null` | |
| `flavour_tags` | `FlavourTag[]` (0–3, unique, palette-only) | |
| `schema_version` | `1` | unchanged |

Validation remains exclusively in `makeDrinkLog()` — voice-originated saves go
through the identical factory, so every invariant (rating range, tag cap/
palette/uniqueness, trims, length clamps) holds regardless of entry mode.

### VoiceDrinkDraft (NEW — transient, never persisted)

`src/ai/schemas/drink.ts`. The validated output of one `structure_drink_note`
call. Exists only between structuring and the user's Save/dismiss decision.

| Field | Type | Validation (Zod) | Source rule |
|---|---|---|---|
| `venue` | `string \| null` | `z.string().nullable()` | café as spoken; `null` if not mentioned |
| `coffee_name` | `string \| null` | `z.string().nullable()` | the drink as spoken ("flat white"); `null` if not mentioned |
| `rating` | `number \| null` | `z.number().int().min(1).max(5).nullable()` | only an explicitly stated rating; vague praise → `null` |
| `flavour_tags` | `FlavourTag[]` | `z.array(z.enum(FLAVOUR_TAGS))` | closed palette enum — off-palette words are unrepresentable |

**Normalization** (`normalizeDrinkDraft`, deterministic, post-validation,
unit-tested): dedupe `flavour_tags` preserving order → cap at first 3. Removal
only — never adds or rewrites values (no fabrication, Principle II).

**Venue casing resolution** (`resolveVenueCasing`, store layer): a non-null
draft venue that matches an existing venue case-insensitively (after trim)
adopts the stored casing (FR-015); otherwise kept verbatim.

**Emptiness** (`isEmptyDrinkDraft`): `venue`, `coffee_name`, `rating` all
`null` **and** `flavour_tags` empty → `DrinkDraftEmptyError` → "didn't catch
that" retry UX (FR-016). A draft with any one field present proceeds to review.

**State transitions**:

```text
(transcript) ──validate──▶ draft ──user Save──▶ DrinkLog   (via makeDrinkLog; rating must be set)
                              │
                              └──dismiss/navigate away──▶ discarded (nothing persisted)  FR-012
```

A draft with `rating: null` renders in the form with Save disabled — identical
to the manual rating gate (FR-013).

### Café / Venue (existing concept — derived, no new storage)

Still a derived projection over `DrinkLog.venue`; this feature widens the read
API in `src/store/drinks.ts`:

| Function | Returns | Notes |
|---|---|---|
| `listVenues()` (existing) | distinct venues, newest-first, case-insensitive dedupe, first-seen casing | unchanged; powers type-ahead |
| `listDrinksByVenue(venue: string \| null)` (NEW) | that café's drinks, newest first | case-insensitive trim match; `null` → entries with no venue (the "No café" bucket, FR-007) |
| `resolveVenueCasing(spoken: string)` (NEW) | canonical casing or verbatim input | FR-015 |

### TelemetryRecord (existing — widened union)

`call` union gains `'structure_drink_note'`. Text call: `input_image_bytes:
null`, `input_text_chars: transcript.length`. No other field changes.

## Routes (presentation state, not storage)

| Route | View | Meaning |
|---|---|---|
| `#/log` | `DrinkLogView` | café-first form + voice entry point (existing route, reworked) |
| `#/drinks` | `DrinksView` | flat newest-first history, café-headlined cards (existing, re-weighted) |
| `#/drinks/at/<encodeURIComponent(venue)>` | `DrinksView` (filtered) | all drinks at one café, newest first (NEW) |
| `#/drinks/no-cafe` | `DrinksView` (filtered) | labelled grouping of venue-less entries (NEW) |

## Migration

None. `DB_VERSION` remains 3; no upgrade branch is added. FR-008 / SC-006
(pre-existing logs intact) hold by construction.
