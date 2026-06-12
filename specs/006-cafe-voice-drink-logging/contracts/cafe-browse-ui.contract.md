# Contract: Café-first UI surfaces & routes

**Feature**: `006-cafe-voice-drink-logging` | **Status**: Draft | **Date**: 2026-06-12

UI-level contract for the café-first re-orientation. All surfaces obey
constitution Principle III: designed at ≤ 430 px first, ≥ 44×44 CSS-px touch
targets, no hover-only/right-click paths.

## 1. Logging form (`#/log`, `DrinkLogForm`)

| Obligation | Requirement |
|---|---|
| Field order | **venue first** (most prominent), rating second, flavour tags third (FR-001) |
| Venue behaviour | type-ahead from `listVenues()` + free-typed values accepted — unchanged from 003 (FR-004) |
| Detail fields | coffee name, origin, process, roast inside ONE collapsed "Add drink details" expander, hidden by default; expanding reveals all four with current behaviour (FR-002) |
| Required gate | rating remains the only required field; Save disabled until set (FR-003) |
| Prefill | accepts optional `initial?: Partial<DrinkInput>`; when present (voice draft) every field renders editable — this IS the review surface (FR-012) |
| Save path | unchanged: `makeDrinkLog(input)` → `addDrink` |
| Regression guard | rating-only manual log: ≤ 2 mandatory interactions, works offline (SC-004) |

## 2. Voice entry (`DrinkRecorder` on `#/log`)

| State | Contract |
|---|---|
| idle | mic button ≥ 44×44, thumb-zone, visible without scrolling at ≤ 430 px (FR-009) |
| unavailable | speech feature-detected → button replaced by non-blocking notice naming the reason (no support / mic denied / offline); form unaffected (FR-014) |
| listening | interim transcript streams on screen; explicit stop control (no silence-timeout guessing) |
| structuring | progress indicator; transcript remains visible |
| review | validated + normalized draft prefills the form (contract §1 Prefill); dismissing saves nothing (FR-012) |
| error | retryable message per `drink-structuring.contract.md`; transcript stays on screen; manual path one tap away (FR-016) |
| interrupted | navigation away stops recognition and discards everything (edge case: no partial entry) |

## 3. History (`#/drinks`, `DrinkCard`)

| Obligation | Requirement |
|---|---|
| Card headline | café name is the most prominent text on every card that has one (FR-005) |
| No-café entries | muted "No café" label in the headline position — never hidden (FR-007) |
| Secondary line | rating, drink name (if any), flavour tags, logged time |
| Café tap-through | tapping the café area (≥ 44×44) navigates to the venue view; 1 interaction from history (SC-005 budget: ≤ 2) |
| Order | flat list, newest first (unchanged) |
| Legacy data | every pre-006 entry renders with all original information (FR-008 / SC-006) |

## 4. Venue view (NEW routes, filtered `DrinksView`)

| Route | Contract |
|---|---|
| `#/drinks/at/<encodeURIComponent(venue)>` | title = café name (stored casing); body = all and only that café's drinks via `listDrinksByVenue(venue)`, newest first; venue match is case-insensitive on the decoded segment; empty result → friendly empty state with a link back to `#/drinks` |
| `#/drinks/no-cafe` | title = "No café"; body = `listDrinksByVenue(null)` — the labelled grouping for venue-less entries (FR-007) |
| Both | render fully offline from IndexedDB (Principle IV); back navigation returns to `#/drinks` |

## 5. Router (`App.tsx`)

- `#/drinks/at/...` and `#/drinks/no-cafe` MUST be matched **before** the plain
  `#/drinks` route (prefix matching).
- The Drinks nav tab stays active (`isActive`) on both new sub-routes.
- The Log-a-drink FAB remains visible on the venue views (they are browsing
  surfaces, not the logging form).
