# Feature Specification: Log a Drink

**Feature Branch**: `003-log-a-drink`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Quick manual drink logging — tap *Log a drink* from home or a floating button, search for a venue (café, roaster stand, or event), name the coffee with optional origin/process/roast detail, rate it 1–5 stars (the only required field), single-tap up to three flavour tags, and have it saved to drink history in under 30 seconds with no account."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log and save a drink in seconds (Priority: P1)

A coffee drinker at a café or festival taps **Log a drink**, optionally types what they're
drinking, gives it a star rating, and saves. The entry immediately appears in their drink
history. This is the irreducible core: capture a rating for a coffee, on the spot, and keep it.

**Why this priority**: This is the reason the feature exists — fast, low-friction capture of a
tasting while standing at a counter or stand. Without it nothing else matters. A user who can
only do this step still gets a usable tasting journal.

**Independent Test**: From a cold start, tap the entry point, set a star rating, save, and confirm
the new entry is visible in drink history — all without entering any other field and without
signing in.

**Acceptance Scenarios**:

1. **Given** the home screen, **When** the user taps **Log a drink** (or the floating action
   button), **Then** the drink-logging form opens with the rating control prominent and focus
   ready for fast entry.
2. **Given** the logging form with a star rating selected and all other fields empty, **When** the
   user taps Save, **Then** a new drink-history entry is created with that rating and a timestamp,
   and the user is returned to a view confirming the save.
3. **Given** the logging form with no star rating selected, **When** the user attempts to Save,
   **Then** the system prevents the save and indicates that a rating is required.
4. **Given** a saved drink, **When** the user views drink history, **Then** the entry appears at
   the top of the list (most recent first) showing at least its rating, name (if given), venue (if
   given), and when it was logged.

---

### User Story 2 - Identify where the drink was had (Priority: P2)

The user records the venue — a café, a roaster's stand, or an event such as "WoC Brussels" — using
a type-ahead search that suggests previously used venues, and can free-type a new venue name when
no match exists.

**Why this priority**: Place is the most valuable piece of context for an event/café tasting
journal and is what makes history meaningful later, but a drink can still be logged without it.

**Independent Test**: Open the form, type part of a venue name, pick a suggestion or free-type a new
one, save, and confirm the venue is stored with the entry and offered as a suggestion on the next
log.

**Acceptance Scenarios**:

1. **Given** the venue field, **When** the user types characters matching a previously used venue,
   **Then** matching venues are suggested and can be selected with a single tap.
2. **Given** a venue with no match, **When** the user free-types a name and continues, **Then** the
   typed text is accepted and stored as the entry's venue.
3. **Given** a drink saved with a newly free-typed venue, **When** the user logs another drink and
   types the same prefix, **Then** that venue now appears as a suggestion.

---

### User Story 3 - Tag flavour notes fast (Priority: P2)

The user marks how the coffee tasted by single-tapping from a fixed palette of flavour tags —
Fruity, Floral, Chocolatey, Nutty, Bright, Heavy — choosing up to three.

**Why this priority**: Flavour tags add memorable character to each entry with near-zero typing,
reinforcing the under-30-second goal, but they are optional embellishment on top of the rating.

**Independent Test**: Open the form, tap up to three flavour tags, attempt a fourth, save, and
confirm the chosen tags are stored and the fourth was prevented.

**Acceptance Scenarios**:

1. **Given** the flavour palette, **When** the user taps a tag, **Then** it becomes selected and
   visibly distinct; tapping it again deselects it.
2. **Given** three tags already selected, **When** the user taps a fourth, **Then** the selection is
   prevented (the fourth is not added) and the limit is communicated.
3. **Given** one or more selected tags, **When** the user saves, **Then** exactly those tags are
   stored with the entry and shown in history.

---

### User Story 4 - Capture optional coffee detail (Priority: P3)

The user optionally enriches the entry with the coffee's name, origin country, process (washed,
natural, or honey), and roast level.

**Why this priority**: Useful for enthusiasts cataloguing what they tried, but entirely skippable
and not on the critical path to a saved log.

**Independent Test**: Open the form, fill any subset of name/origin/process/roast, save, and confirm
each provided value is stored and displayed; confirm leaving them blank still saves.

**Acceptance Scenarios**:

1. **Given** the detail fields, **When** the user enters a coffee name and/or origin and selects a
   process and/or roast level, **Then** each provided value is stored with the entry.
2. **Given** all detail fields left blank, **When** the user saves with only a rating, **Then** the
   entry saves successfully with those details absent.
3. **Given** the process selector, **When** the user opens it, **Then** the available choices are
   washed, natural, and honey.

---

### Edge Cases

- **No rating chosen**: Save is blocked and the rating requirement is surfaced; no entry is created.
- **Venue typed but not matched**: The free-typed value is kept verbatim as the venue.
- **Fourth flavour tag**: Selection is capped at three; the extra tap does not add a tag.
- **Empty optional fields**: An entry with only a rating (and timestamp) is valid.
- **Offline / no connectivity**: Logging and saving work fully without network access; entries
  persist locally.
- **Rapid successive logs**: Logging several drinks in quick succession at one venue each produces a
  distinct, correctly timestamped entry.
- **Duplicate venue casing/whitespace**: Venue suggestions should not multiply into near-duplicates
  that differ only by surrounding whitespace.
- **Long free-text**: Overly long names/venues are accepted up to a reasonable limit without
  breaking the layout or the save.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST present a **Log a drink** entry point on the home screen and as a
  persistent floating action button reachable from the app's primary surfaces.
- **FR-002**: The system MUST let the user assign a 1–5 star rating, and MUST require a rating
  before a drink can be saved.
- **FR-003**: The system MUST treat every field other than the rating as optional, allowing a drink
  to be saved with only a rating.
- **FR-004**: The system MUST let the user record a venue via a type-ahead field that suggests
  previously used venues and accepts a free-typed value when no suggestion matches.
- **FR-005**: The system MUST remember venues from saved drinks so they become suggestions for
  subsequent logs.
- **FR-006**: The system MUST let the user enter a free-text coffee name.
- **FR-007**: The system MUST let the user optionally specify origin country, process (one of
  washed, natural, honey), and roast level.
- **FR-008**: The system MUST offer a fixed flavour-tag palette of exactly: Fruity, Floral,
  Chocolatey, Nutty, Bright, Heavy.
- **FR-009**: The system MUST allow single-tap selection and deselection of flavour tags and MUST
  cap the number of selected tags at three.
- **FR-010**: The system MUST append each saved drink to a persistent drink history, recording the
  time it was logged.
- **FR-011**: The system MUST display drink history with the most recent entries first, showing at
  least rating, name (if any), venue (if any), flavour tags (if any), and when it was logged.
- **FR-012**: The system MUST persist drink history locally so it survives app restarts and is
  available without network connectivity.
- **FR-013**: The system MUST NOT require any account, sign-in, or remote service to log or view
  drinks.
- **FR-014**: The system MUST confirm a successful save to the user (e.g., returning to history with
  the new entry visible).

### Key Entities *(include if feature involves data)*

- **Drink Log**: A single tasting captured by the user. Attributes: rating (1–5, required), logged
  timestamp (required), optional coffee name, optional venue, optional origin country, optional
  process (washed/natural/honey), optional roast level, and up to three flavour tags. Stands on its
  own — it is not the same as an owned/scanned coffee bag.
- **Venue**: A place a drink was had — a café, roaster stand, or event. Identified by a name;
  accumulated from prior Drink Logs to power type-ahead suggestions.
- **Flavour Tag**: One value from a fixed palette (Fruity, Floral, Chocolatey, Nutty, Bright,
  Heavy). A Drink Log carries zero to three.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can log a drink — from tapping the entry point to a saved, visible
  history entry — in under 30 seconds, providing only a rating.
- **SC-002**: A complete drink with venue, name, and flavour tags can be logged in under 60 seconds.
- **SC-003**: Saving a drink requires no more than two mandatory interactions (set rating, tap save).
- **SC-004**: 100% of save attempts that include a rating succeed and appear in history; 100% of
  attempts without a rating are blocked with a clear prompt.
- **SC-005**: A previously used venue is offered as a suggestion within the first three typed
  characters on the next log.
- **SC-006**: Drinks can be logged and reviewed with no network connection and with no account, in
  100% of cases.
- **SC-007**: The flavour-tag limit holds in 100% of cases — no entry is ever saved with more than
  three tags.

## Assumptions

- **Standalone tasting journal**: A logged drink is a lightweight tasting record distinct from
  scanned coffee bags (`001`) and home brew logs (`002`). It lives in its own drink-history list and
  does not require, create, or link to a coffee card. (If integration with existing coffee cards is
  later desired, that is a separate feature.)
- **Local-first persistence**: Drink history is stored on-device, consistent with the app's
  local-first, BYOK, no-backend architecture. No external venue database is used; venue suggestions
  are drawn from the user's own prior logs.
- **Single user, no auth**: There is one local user per device; no account, login, or sync is in
  scope.
- **Fixed flavour palette**: The six flavour tags are fixed for this feature; custom user-defined
  flavour tags are out of scope.
- **Manual entry only**: This flow is purely manual typing/tapping; AI vision extraction and voice
  capture are out of scope here (they belong to features `001` and `002`).
- **Process options**: The process selector offers washed, natural, and honey; other processes are
  out of scope for v1.
- **Mobile-first**: The experience is designed for one-handed mobile use, matching the rest of the
  app.
- **Editing/deletion**: Viewing and creating drink logs is in scope; editing or deleting existing
  entries may be addressed separately and is not required for this feature's success criteria.
