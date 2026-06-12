# Feature Specification: Café-First Drink Logging with Voice Capture

**Feature Branch**: `006-cafe-voice-drink-logging`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "drink logging to focus on cafe and not the drink and add voice logging for drinks"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log a drink café-first (Priority: P1)

A coffee drinker walks into a café and opens the drink-logging form. The café is now
the headline of the experience: the venue field is the first and most prominent thing
they see, with their previously visited cafés suggested as they type. The coffee's bean
detail (name, origin, process, roast) is tucked away behind an optional "add drink
details" expansion they can ignore entirely. The typical log becomes: pick the café,
tap a rating, save.

**Why this priority**: This is the core re-orientation the feature asks for — the
journal's organizing question shifts from "what did I drink?" to "where did I drink?".
Every other part of the feature builds on the café being the anchor of an entry.

**Independent Test**: Open the logging form and confirm the café field appears first
and most prominently, bean-detail fields are collapsed by default, and a log with café
+ rating saves successfully — without touching any drink-detail field.

**Acceptance Scenarios**:

1. **Given** the drink-logging form, **When** it opens, **Then** the café field is the
   first and visually most prominent input, ahead of the rating and all drink fields.
2. **Given** the logging form, **When** the user looks for coffee name, origin, process,
   or roast, **Then** those fields are collapsed behind a single optional expansion and
   are not shown by default.
3. **Given** a café selected and a rating set, **When** the user saves, **Then** the
   entry is created with that café and appears in history with the café as its headline.
4. **Given** the café field, **When** the user types characters matching a previously
   used café, **Then** matching cafés are suggested and selectable with one tap (as
   today), and a free-typed new café name is still accepted.
5. **Given** no café entered and a rating set, **When** the user saves, **Then** the
   entry still saves successfully (café remains optional).

---

### User Story 2 - Log a drink by voice (Priority: P1)

Standing at the counter, the user taps a microphone button on the drink-logging flow and
says something like *"flat white at Sunday's Coffee, four stars, fruity and bright"*. The
system turns the spoken description into a structured draft — café, drink name, rating,
flavour tags — and shows it for review. The user corrects anything that was misheard,
then saves. Nothing is ever saved without their confirmation.

**Why this priority**: Voice is the second explicit ask and the biggest friction
reduction available — it collapses the whole form into one sentence. It is independently
valuable even if the café-first re-layout (Story 1) never shipped.

**Independent Test**: Tap the microphone, speak a description containing a café, a
rating, and one or two flavour tags, and confirm the review screen shows those values in
the correct fields; confirm saving requires an explicit user action.

**Acceptance Scenarios**:

1. **Given** the drink-logging flow, **When** the user taps the voice entry point and
   speaks a drink description, **Then** the system presents a structured draft populating
   café, drink name, rating, and flavour tags from what was said.
2. **Given** a voice draft on the review screen, **When** the user edits any field and
   confirms, **Then** the saved entry reflects the edited values, not the raw draft.
3. **Given** a voice draft, **When** the user dismisses it without confirming, **Then**
   nothing is saved to drink history.
4. **Given** a spoken description with no discernible rating, **When** the draft is
   shown, **Then** the rating is left unset and the save remains blocked until the user
   sets one (rating is still the only required field).
5. **Given** a spoken description mentioning flavours, **When** the draft is shown,
   **Then** only flavours matching the fixed palette (Fruity, Floral, Chocolatey, Nutty,
   Bright, Heavy) are selected, capped at three.

---

### User Story 3 - Browse history by café (Priority: P2)

Reviewing their journal, the user sees each history entry headlined by the café it was
logged at. From any entry (or from a café suggestion), they can see all drinks they have
logged at that café in one place — turning the history into a record of places as much
as drinks.

**Why this priority**: This completes the café-first re-orientation in the reading
direction. It is valuable but secondary — logging (Stories 1–2) must work before
browsing by café matters.

**Independent Test**: Log two drinks at the same café and one at another, open history,
confirm each entry headlines its café, then view the first café and confirm exactly its
two drinks are shown.

**Acceptance Scenarios**:

1. **Given** drink history, **When** entries are listed, **Then** each entry with a café
   shows the café name as its most prominent text, with rating, drink name (if any), and
   tags secondary.
2. **Given** several drinks logged across multiple cafés, **When** the user selects a
   café, **Then** they see all — and only — the drinks logged at that café, most recent
   first.
3. **Given** entries logged without a café, **When** history is viewed, **Then** those
   entries remain visible and are presented under a clearly labelled "no café" grouping
   rather than disappearing.
4. **Given** drink history existing from before this change, **When** the user opens the
   updated history, **Then** every previously logged drink still appears with all its
   original information.

---

### Edge Cases

- **Voice unavailable** (microphone permission denied, unsupported device, or no
  connectivity): the voice entry point communicates why it is unavailable, and the manual
  café-first form remains fully usable.
- **Transcription fails or is gibberish**: the user is told the description could not be
  understood and can retry by voice or fall back to manual entry; nothing is saved.
- **More than three flavours spoken**: at most three palette tags are selected in the
  draft; the cap is visible on the review screen as it is in manual entry.
- **Flavour words outside the palette** ("jammy", "winey"): ignored rather than forced
  into a wrong tag; the user can tap tags manually on review.
- **Vague rating words** ("pretty good"): only a clearly expressed rating maps to stars;
  otherwise the rating is left unset for the user to choose.
- **New café spoken aloud**: treated like a free-typed café — stored verbatim and offered
  as a suggestion on later logs.
- **Spoken café nearly matching an existing one** (casing/whitespace differences): matched
  to the existing café rather than creating a near-duplicate.
- **Mid-dictation interruption** (call, navigation away): no partial entry is saved.
- **Rating-only quick log**: still possible — no café and no voice required, preserving
  the under-30-second manual flow.

## Requirements *(mandatory)*

### Functional Requirements

**Café-first re-orientation**

- **FR-001**: The drink-logging form MUST present the café (venue) field as the first and
  most visually prominent input, ahead of rating and all drink-detail fields.
- **FR-002**: The form MUST collapse the coffee-detail fields (coffee name, origin
  country, process, roast level) behind a single optional expansion, hidden by default;
  when expanded, all existing options remain available.
- **FR-003**: The rating MUST remain the only required field; entries MUST still save
  with a rating alone (no café, no details).
- **FR-004**: Café type-ahead behaviour MUST be preserved: previously used cafés are
  suggested, and free-typed new café names are accepted and remembered for future
  suggestions.
- **FR-005**: Drink-history entries MUST headline the café name when one exists, with
  rating, drink name, and flavour tags presented as secondary detail.
- **FR-006**: The user MUST be able to view all drinks logged at a given café in one
  place, most recent first.
- **FR-007**: Entries without a café MUST remain visible in history under a clearly
  labelled grouping.
- **FR-008**: All drink logs created before this change MUST continue to display
  correctly in the café-first presentation with no data loss.

**Voice logging**

- **FR-009**: The drink-logging flow MUST offer a voice entry point that captures a
  spoken drink description.
- **FR-010**: The system MUST convert the spoken description into a structured draft
  populating, where mentioned: café, drink/coffee name, rating (1–5), and flavour tags.
- **FR-011**: Flavour tags derived from speech MUST be limited to the existing fixed
  palette (Fruity, Floral, Chocolatey, Nutty, Bright, Heavy) and capped at three; spoken
  flavours outside the palette MUST be ignored, never misassigned.
- **FR-012**: The structured draft MUST be presented for user review, with every field
  editable, before anything is saved; dismissing the draft MUST save nothing.
- **FR-013**: A voice draft without a discernible rating MUST leave the rating unset and
  block save until the user provides one.
- **FR-014**: When voice capture is unavailable (permission denied, unsupported, or no
  connectivity), the system MUST communicate the reason and the manual logging flow MUST
  remain fully functional, including offline.
- **FR-015**: A spoken café name that matches an existing café (ignoring casing and
  surrounding whitespace) MUST resolve to that café rather than creating a duplicate.
- **FR-016**: Failed or unintelligible voice captures MUST produce a clear, retryable
  message and MUST NOT create an entry.

### Key Entities *(include if feature involves data)*

- **Drink Log**: Unchanged in substance from the existing journal — rating (required),
  timestamp, optional café, optional drink/coffee name, optional origin/process/roast,
  up to three flavour tags. What changes is emphasis: the café becomes its headline
  attribute, and it can now be created from a voice draft as well as manual entry.
- **Café (Venue)**: A place a drink was had. Elevated from a passing attribute to the
  organizing concept of the journal: history is headlined and browsable by café.
  Still identified by name and accumulated from the user's own logs.
- **Voice Draft**: A transient, structured interpretation of one spoken description —
  proposed café, drink name, rating, and flavour tags. Exists only for review; it
  becomes a Drink Log solely through explicit user confirmation and is discarded
  otherwise.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log a drink by voice — from tapping the entry point, through
  speaking and review, to a saved entry — in under 20 seconds for a description covering
  café, rating, and flavours.
- **SC-002**: A clearly spoken description mentioning a café, an explicit rating, and
  palette flavours populates all of those fields correctly, needing no manual correction,
  in at least 90% of attempts.
- **SC-003**: 100% of voice drafts require an explicit user confirmation before saving;
  dismissed drafts never appear in history.
- **SC-004**: The manual rating-only log still completes in under 30 seconds with no
  more than two mandatory interactions (set rating, save) — no regression from the
  existing journal.
- **SC-005**: From drink history, a user can reach the full list of drinks logged at a
  given café in at most 2 interactions.
- **SC-006**: 100% of pre-existing drink logs remain visible and intact after the
  café-first change.
- **SC-007**: When voice is unavailable for any reason, manual logging succeeds in 100%
  of cases, including with no network connection.
- **SC-008**: No saved entry — voice or manual — ever carries more than three flavour
  tags or a tag outside the fixed palette.

## Assumptions

- **Emphasis, not new obligation**: "Focus on the café" is interpreted as re-ordering and
  re-weighting the experience around the café — not making the café mandatory. The rating
  stays the only required field so the under-30-second quick log (and logging when not at
  a café) survives.
- **Detail fields demoted, not removed**: Coffee name, origin, process, and roast remain
  available behind an optional expansion. Existing entries keep this data, so removal
  would orphan it; demotion satisfies "not the drink" without data loss.
- **Voice follows the established review-before-save pattern**: As with the existing
  voice brew-logging experience, spoken input always produces an editable draft that the
  user confirms — never a direct save.
- **Voice requires connectivity**: Interpreting speech into structured fields needs the
  network; manual logging remains fully offline-capable. Voice gracefully degrades to
  manual when offline.
- **English-language speech**: Voice capture targets English descriptions for v1; other
  languages are out of scope.
- **Own-history cafés only**: No external café directory or location service is used;
  café suggestions and café browsing draw solely from the user's own logged entries.
- **Fixed flavour palette unchanged**: The six existing tags and the three-tag cap carry
  over; voice does not introduce new tags.
- **Editing/deleting entries**: Still out of scope, as in the original drink-logging
  feature.
