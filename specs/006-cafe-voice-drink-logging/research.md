# Phase 0 Research: Café-First Drink Logging with Voice Capture

**Feature**: `006-cafe-voice-drink-logging` | **Date**: 2026-06-12

No `NEEDS CLARIFICATION` markers existed in the Technical Context; the research
below records the design decisions that resolve every open implementation
question, with rationale and rejected alternatives.

---

## D1. Voice capture: reuse the 002 Web Speech wrapper unchanged

**Decision**: Reuse `startTranscription()` / `isSpeechRecognitionAvailable()`
from `src/lib/speech.ts` exactly as shipped in 002 — continuous session,
interim-result streaming, explicit user stop, `no-speech`-tail tolerance.

**Rationale**: The wrapper already encodes the hard-won 002 behaviours
(continuous mode so natural pauses don't truncate; explicit stop instead of a
silence timer; vendor-prefix resolution isolated for stubbing in tests). A
drink note ("flat white at Sunday's, four stars, fruity and bright") is the
same shape of input as a brew note. The constitution's Web Speech requirements
(feature-detect on first use, non-blocking notice, manual path always viable)
are already satisfied by this wrapper plus the existing form.

**Alternatives considered**:
- *New drink-specific speech module* — rejected: pure duplication; nothing
  about drink dictation differs at the capture layer.
- *MediaRecorder + server-side transcription* — rejected: no backend exists
  (constitution), and Web Speech is the constitutionally named voice API.

## D2. One new Claude call: `structure_drink_note` via `callClaudeTool`

**Decision**: Add a single text-input tool-use call, telemetry name
`structure_drink_note`, tool name `record_drink_log`, routed through the
existing `callClaudeTool` wrapper in `src/ai/client.ts` (which brings retry-
once-on-schema-error, telemetry, and 005 key resolution for free). An all-null
draft throws `DrinkDraftEmptyError` → the "didn't catch that" retryable UX,
mirroring `BrewEmptyError`.

**Rationale**: Identical architecture to 002's `structure_brew_note` — proven,
constitution-compliant (Principle II via Zod-derived `input_schema`,
Principle V via wrapper telemetry), and exactly 1 call per user action.

**Alternatives considered**:
- *Reuse `structure_brew_note` with a widened schema* — rejected: brew and
  drink vocabularies differ (dose/temperature vs. venue/rating/tags); widening
  one schema for two jobs degrades both prompts and couples unrelated golden
  fixtures.
- *Client-side regex/keyword parsing (no AI call)* — rejected: venue names and
  free-form ratings ("four and a half… call it four") are exactly what the
  model handles and regexes do not; would also bypass the established
  schema-first pipeline rather than simplify it.

## D3. Draft schema and flavour-tag discipline

**Decision**: `VoiceDrinkDraftSchema` (Zod, `src/ai/schemas/drink.ts`):

```ts
{
  venue: z.string().nullable(),
  coffee_name: z.string().nullable(),          // the drink as spoken ("flat white")
  rating: z.number().int().min(1).max(5).nullable(),
  flavour_tags: z.array(z.enum(FLAVOUR_TAGS)), // closed palette enum
}
```

The tool's JSON Schema (via `zod-to-json-schema`) therefore presents the
flavour palette as a closed `enum` — the model cannot emit "jammy". The prompt
additionally instructs: only explicitly stated values; vague ratings ("pretty
good") → `null`; flavours outside the palette → omit. After successful Zod
validation, a **deterministic** `normalizeDrinkDraft()` dedupes tags and caps
them at three (first three mentioned) before the draft reaches the UI.

**Rationale**: Enum-in-schema is the strongest guard (Principle II: validation
before render); normalization-after-validation keeps a 4-tag or duplicated
response usable instead of burning the single retry on a trivially fixable
overage. Normalization is pure and unit-tested — it never invents data, only
removes it, so it does not violate the no-fabrication rule. Persistence
re-enforces the cap independently via `makeDrinkLog` (defence in depth).

**Alternatives considered**:
- *`.max(3)` on the array (hard validation failure on overage)* — rejected: a
  schema-valid-but-4-tags response would fail → retry → likely fail again →
  user dumped to manual entry for a draft we could have shown. Worse UX, same
  data integrity.
- *Free-text tags mapped client-side* — rejected: reopens the off-palette
  misassignment risk FR-011 forbids; enum closes it at the source.
- *Including origin/process/roast in the voice schema* — rejected: spec FR-010
  scopes voice to café, drink name, rating, tags; the demoted detail fields
  stay manual (and remain editable on the review form).

## D4. Venue resolution from speech

**Decision**: `resolveVenueCasing(spoken)` in `src/store/drinks.ts` compares
the trimmed spoken venue case-insensitively against `listVenues()` (which is
already first-seen-casing, case-insensitively deduped). On a hit, the draft
adopts the stored casing (FR-015 — no near-duplicates); on a miss, the spoken
text is kept verbatim, exactly like a free-typed venue (then offered as a
suggestion on later logs, FR-004).

**Rationale**: Reuses the precise normalization rules the store already
applies (`trim`, case-insensitive key), so voice and typing converge on the
same venue identity rules with one source of truth.

**Alternatives considered**:
- *Fuzzy matching (edit distance)* — rejected: risks silently merging genuinely
  distinct cafés ("Blue Bottle" / "Blue Kettle"); the spec only requires
  casing/whitespace tolerance.
- *External café/places lookup* — rejected: spec Assumption explicitly scopes
  suggestions to the user's own history; no external services in this app.

## D5. History presentation: flat recency list with café headline + venue-filtered route

**Decision**: `#/drinks` stays a flat newest-first list (recency is the journal's
existing mental model), but each `DrinkCard` is re-weighted: **café name is the
headline**; rating, drink name, and tags are secondary; entries without a café
headline a muted "No café" label. Tapping the café on a card (≥ 44×44 target)
navigates to `#/drinks/at/<encodeURIComponent(venue)>` — the same `DrinksView`
in filtered mode showing all (and only) that café's drinks, newest first, with
the café as the page title. "No café" taps go to `#/drinks/no-cafe` (the
labelled grouping required by FR-007). That is history → café list in **one**
interaction (SC-005 allows two).

**Rationale**: Satisfies FR-005/006/007 and the café-as-organizing-concept
re-orientation without destroying chronological browsing, and without any
store/index change. Hash-route filtering matches the app's existing minimalist
router (`#/coffee/<id>` precedent).

**Alternatives considered**:
- *Group the main history by café with section headers* — rejected: breaks
  recency scanning ("what did I drink this week?") and makes the common
  multi-café day read worse; the filtered view delivers the grouping on demand.
- *New IndexedDB index on `venue`* — rejected: requires a v4 migration for a
  dataset of (at most) hundreds of rows; the in-memory filter on `listDrinks()`
  is already the pattern used by `listVenues()`. No measurable benefit.
- *Query-string filter (`#/drinks?venue=…`)* — rejected: the router matches on
  hash prefixes; a path segment is consistent with `#/coffee/<id>`.

## D6. Café-first form: one form is both manual entry and voice review

**Decision**: Rework `DrinkLogForm` field order to venue → rating → flavour
tags, with coffee name / origin / process / roast inside a single collapsed
"Add drink details" expander (collapsed by default; FR-001/002). The form gains
an optional `initial?: Partial<DrinkInput>` prop. The voice flow validates +
normalizes the draft, resolves venue casing, and renders **the same form
prefilled** as the review surface (FR-012): every field editable, Save = the
explicit confirmation, Cancel/back = dismiss with nothing persisted.

**Rationale**: One form means the café-first layout, the rating-required gate,
the three-tag cap, and the save path are implemented once and identical for
both entry modes — eliminating an entire class of drift bugs and a redundant
review component. 002 needed a separate `BrewReview` because brews have no
manual-first form on the same screen; drinks already do.

**Alternatives considered**:
- *Separate `DrinkReview` component (002-style)* — rejected: duplicate of the
  form with different bugs; the spec's review requirements (every field
  editable, explicit confirm) are exactly what the form already is.
- *Auto-save high-confidence drafts* — rejected outright: FR-012/SC-003 require
  explicit confirmation in 100% of cases.

## D7. No persistence changes

**Decision**: `DB_VERSION` stays **3**; the `drinks` store, `DrinkLog` shape,
and `schema_version: 1` are untouched. The feature is presentation (form/card/
views/routes) + one new AI call. Saved voice drinks flow through the existing
`makeDrinkLog` → `addDrink` invariants.

**Rationale**: Nothing in the spec adds a stored attribute — the café was
already first-class data (`venue`); only its prominence changes. Zero migration
risk delivers FR-008 (pre-existing logs intact) by construction.

**Alternatives considered**:
- *Promote venues to their own object store* — rejected: suggestions and
  filtering derive from drinks in memory today; a venue store adds a migration
  and a write-path (keeping two stores consistent) with no user-visible gain at
  this scale.

## D8. Failure & offline behaviour

**Decision**:
- Speech unsupported / mic denied → mic button replaced by a non-blocking
  notice naming the reason (existing `SpeechUnavailableError` /
  `SpeechRecognitionFailedError('not-allowed')` codes); manual form untouched.
- Offline / network failure during structuring → retryable error state that
  **keeps the transcript visible on screen** so the user can retry or copy the
  details into the form by hand — nothing spoken is lost (Principle IV; 002
  precedent).
- Empty/gibberish structuring result (`DrinkDraftEmptyError`) → "Didn't catch
  that — try again, or log it by hand." (FR-016).
- Navigation away mid-capture or mid-review → recognition stopped, draft
  discarded, nothing persisted (spec edge case).

**Rationale**: Matches the constitution's no-silent-failure and no-data-loss
rules with the smallest mechanism that satisfies them, and keeps the manual
path (which also works offline) one tap away in every failure state.

**Alternatives considered**:
- *Persist queued transcripts for later structuring* — rejected for v1: the
  on-screen retry covers the realistic failure window; a durable queue adds a
  store + lifecycle UI the spec doesn't ask for. (002 made the same call.)

## D9. Telemetry & cost accounting

**Decision**: `'structure_drink_note'` joins the `TelemetryRecord['call']`
union; the call reports `input_text_chars` (transcript length — never the
transcript itself), output tokens, latency, model id, status, and retry flag
via the wrapper. Calls per user action: **voice log = 1, manual log = 0**.

**Rationale**: Principle V compliance with zero new mechanism; well under the
≥ 3-call Complexity Tracking threshold.

**Alternatives considered**: none viable — bypassing `callClaudeTool` would
forfeit telemetry and retry and violate the established architecture.
