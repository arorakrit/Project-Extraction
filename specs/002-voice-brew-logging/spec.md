# Feature Specification: Voice Brew-Logging

**Feature Branch**: `002-voice-brew-logging`

**Created**: 2026-06-02

**Status**: Draft

**Input**: User description: "Voice brew-logging: from a saved coffee card, the user taps to record a spoken brew note over a fresh pour, the app transcribes it and extracts structured brew parameters (method, dose, water, ratio, grind, temp, time, tasting note) into a brew log entry tied to that coffee. Entries persist locally, show in a timeline on the coffee detail view, and every field is tappable to edit. Mobile-first, BYOK, with a manual-entry fallback when speech recognition is unavailable."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Speak a brew note and get a structured log entry (Priority: P1)

A user has just pulled a fresh cup using a coffee they've already saved. With the
phone in one hand and the kettle still warm, they open that coffee's page, tap a
single record button, and say something natural like "V60, eighteen grams in,
three hundred out, medium-fine grind, ninety-four degrees, two and a half
minutes, really bright and floral with a lemon finish." Within a few seconds the
app shows a brew log entry with the spoken details sorted into the right
fields — brew method, dose, water, ratio, grind, water temperature, total time,
and a free-text tasting note — attached to that coffee. They glance over it,
fix anything that came out wrong, and save.

**Why this priority**: This is the hero moment of the feature — "I talked to my
phone over a fresh pour and it remembered my brew." Without spoken capture
turning into a structured, coffee-linked entry, the feature does not exist.
Everything else (history, editing, manual fallback) hangs off this single flow.

**Independent Test**: From a saved coffee's page on a phone, tap record, speak a
single natural brew description, and verify that within a few seconds a brew log
entry appears with the spoken values placed in the correct fields and the entry
tied to that specific coffee. No history view or fallback path is required for
this test.

**Acceptance Scenarios**:

1. **Given** a user is on a saved coffee's page with the microphone available,
   **When** they tap record and speak a brew description containing method,
   dose, water, grind, temperature, time, and a tasting impression, **Then**
   within a short waiting period they see a brew log entry with each spoken
   value placed in its matching field and a free-text tasting note captured.
2. **Given** the spoken note omits some parameters (e.g., no temperature
   mentioned), **When** the entry is shown, **Then** the unmentioned fields
   appear explicitly empty rather than being filled with invented values.
3. **Given** a brew log entry has been generated from speech, **When** the user
   notices a field is wrong, **Then** they can edit any field directly before
   saving.
4. **Given** the user stated a dose and a water amount, **When** the entry is
   shown, **Then** the brew ratio is presented (derived from dose and water)
   without the user having to compute it, and remains editable.
5. **Given** the speech was unintelligible or captured no usable brew
   information, **When** processing finishes, **Then** the user sees a friendly,
   actionable message ("Didn't catch that — try again, or enter it by hand")
   with both options reachable in one tap.
6. **Given** the user has finished reviewing the entry, **When** they tap Save,
   **Then** the brew log entry is recorded on the device and attached
   permanently to that coffee.

---

### User Story 2 - Review a coffee's brew history over time (Priority: P2)

Over weeks of drinking the same bag, the user logs several brews against the
same coffee. When they open that coffee's page, they see a timeline of every
brew they've logged for it — most recent first — each showing the key
parameters at a glance (method, ratio, grind, and the tasting note). Tapping any
past brew opens it for review, and any field can be corrected. This history
works offline.

**Why this priority**: A single brew log is a note; a history is a learning
tool — it's how a user sees "the 1:16 at a finer grind tasted better than the
1:15." It turns logging into dial-in feedback, but the product is still useful
with just single-entry capture, so it sits below P1.

**Independent Test**: Log two or more brews against the same saved coffee, close
the app fully, reopen it (ideally offline), open that coffee, and verify all
logged brews appear in a most-recent-first timeline with their key parameters
visible and each entry openable for editing.

**Acceptance Scenarios**:

1. **Given** a coffee has one or more saved brew log entries, **When** the user
   opens that coffee's page, **Then** they see those entries in a timeline
   ordered most-recent-first, each showing at least method, ratio, grind, and
   the tasting note.
2. **Given** the device has no network connectivity, **When** the user opens a
   coffee with previously saved brews, **Then** the full brew history displays
   without error.
3. **Given** a past brew entry exists, **When** the user opens it and edits a
   field, **Then** the change is persisted and reflected in the timeline.
4. **Given** a brew entry the user no longer wants, **When** they delete it,
   **Then** it is removed from the coffee's timeline and does not reappear.
5. **Given** a coffee with no brews logged yet, **When** the user opens its
   page, **Then** they see a clear empty state inviting them to log their first
   brew, with the record action reachable in one tap.

---

### User Story 3 - Log a brew by hand when voice isn't an option (Priority: P3)

Some users are in a silent environment, on a device whose speech recognition is
unavailable, or simply prefer typing. From the same coffee page, they choose to
enter a brew manually: a form with the same fields (method, dose, water, ratio,
grind, temperature, time, tasting note), each tappable, producing the same kind
of brew log entry tied to the coffee.

**Why this priority**: It guarantees the feature degrades gracefully and is
never a dead end when the microphone can't be used — but it's a fallback, not
the headline interaction, so it ranks last.

**Independent Test**: On a device or session where speech recognition is
unavailable (or by explicitly choosing manual entry), fill in the brew fields by
hand, save, and verify the resulting entry is identical in kind to a
voice-captured one and appears in the coffee's timeline.

**Acceptance Scenarios**:

1. **Given** the device reports that speech recognition is unavailable, **When**
   the user goes to log a brew, **Then** the manual-entry form is presented
   automatically and the record button does not lead to a broken state.
2. **Given** a user who prefers typing, **When** they choose manual entry on a
   device where voice is available, **Then** they can fill the same fields by
   hand and save an equivalent entry.
3. **Given** a manually entered brew with a dose and water, **When** the entry
   is shown, **Then** the ratio is derived automatically just as it is for
   voice entries.

---

### Edge Cases

- The user speaks values with mixed or ambiguous units ("ninety-four" with no
  "degrees", "three hundred" with no "grams") — the system applies the
  domain-standard interpretation (temperature in °C, dose/water in grams) and
  leaves the field editable so the user can correct an unusual setup.
- The user speaks a ratio directly ("one to sixteen") instead of, or in
  addition to, a dose and water — the stated ratio is captured; if dose and
  water are also given and conflict with the spoken ratio, the dose/water pair
  is treated as authoritative and the ratio is recomputed.
- The spoken note is mostly tasting language with no measurable parameters ("so
  juicy, tastes like ripe cherry") — the tasting note is captured and the
  measurable fields are left empty rather than guessed.
- The user grants, then later denies, microphone permission — the manual-entry
  path remains fully available and the app surfaces how to re-enable the mic.
- The user records a very long, rambling note — the system still extracts the
  recognized parameters and preserves the full spoken note as the tasting note
  text.
- The user backgrounds the app mid-capture — on return they either see the
  finished entry for review or a clear "try again" state; no half-parsed entry
  is silently saved.
- The coffee the brew was being logged against is deleted while brews exist —
  its brew entries are removed with it (a brew cannot outlive its coffee in
  v1).

## Requirements *(mandatory)*

### Functional Requirements

**Voice capture & extraction (Story 1)**

- **FR-001**: Users MUST be able to initiate a spoken brew note from a saved
  coffee's page with a single tap.
- **FR-002**: System MUST transcribe the user's spoken brew note into text.
- **FR-003**: System MUST extract, from the transcribed note, structured brew
  parameters into these fields at minimum: brew method, dose, water, ratio,
  grind setting/description, water temperature, total brew time, and a
  free-text tasting note.
- **FR-004**: System MUST present the extracted brew entry to the user for
  review before persisting it; the user reviews before saving.
- **FR-005**: System MUST mark any parameter not present in the spoken note as
  explicitly empty and MUST NOT fabricate plausible values for unmentioned
  parameters.
- **FR-006**: System MUST derive the brew ratio from dose and water when both
  are present, present it to the user, and keep it editable.
- **FR-007**: Users MUST be able to edit any field on the brew entry before
  saving.
- **FR-008**: When speech yields no usable brew information, the system MUST
  surface a clear, one-screen message offering both "try again" and "enter by
  hand" as one-tap options.
- **FR-009**: System MUST surface a recognizable in-progress state from the end
  of recording until the brew entry is rendered (or failure shown).
- **FR-010**: Each saved brew log entry MUST be permanently associated with the
  specific coffee it was logged against.

**Brew history (Story 2)**

- **FR-011**: System MUST display, on a coffee's page, a timeline of all brew
  log entries for that coffee, ordered most-recent-first, each summarizing at
  minimum method, ratio, grind, and tasting note.
- **FR-012**: The brew history and each entry's detail MUST be viewable offline.
- **FR-013**: Brew log entries MUST persist across app closes, device restarts,
  and offline sessions.
- **FR-014**: Users MUST be able to open any past brew entry and edit any field,
  with changes persisted and reflected in the timeline.
- **FR-015**: Users MUST be able to delete an individual brew log entry.
- **FR-016**: A coffee with no brew entries MUST show a clear empty state with a
  one-tap path to log the first brew.

**Manual fallback (Story 3)**

- **FR-017**: When speech recognition is unavailable, the system MUST
  automatically present a manual brew-entry form rather than a broken record
  action.
- **FR-018**: Users MUST be able to choose manual entry even when speech is
  available.
- **FR-019**: A manually entered brew MUST produce a brew log entry equivalent
  in kind and structure to a voice-captured one, including ratio derivation.

**Cross-cutting**

- **FR-020**: All primary actions in this flow (start recording, review/edit,
  save, open a past brew) MUST be usable one-handed on a mobile device.
- **FR-021**: When a coffee is deleted, all brew log entries associated with it
  MUST be deleted along with it.
- **FR-022**: The save of a single brew entry MUST be atomic — once the user
  taps Save, either the full entry lands in the device's local store, or
  nothing does (no partial entries). Pre-save state (the in-review entry
  between extraction and tap-Save) is NOT durable in v1: if the session is
  killed mid-review, the user re-records.

### Key Entities

- **Brew Log Entry**: A single record of one brewing session for one coffee.
  Holds the structured parameters (brew method, dose, water, ratio, grind, water
  temperature, total time), a free-text tasting note, the timestamp of when the
  brew was logged, and a reference to its parent coffee. Shown both immediately
  after capture (for review) and later in the coffee's timeline.
- **Brew Transcript**: The intermediate spoken-then-transcribed text for a
  voice-captured brew, plus the structured extraction derived from it.
  Distinguishes "parameter was not spoken" from "parameter could not be
  understood" so the user can act accordingly. Becomes a Brew Log Entry on
  success or triggers the failure flow when nothing usable was captured.
- **Coffee (existing)**: The saved coffee from feature 001 to which brew log
  entries attach. This feature adds a one-to-many relationship: one coffee has
  many brew log entries. No new coffee fields are introduced here.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the user finishes speaking a brew note, a structured brew
  entry is presented for review within 10 seconds, in 90% of attempts.
- **SC-002**: Across a representative sample of **at least 5** naturally spoken
  brew notes (covering different brew methods and phrasings), at least 80% of
  the parameters actually stated by the user are placed in the correct field on
  the first attempt.
- **SC-003**: When speech captures no usable brew information, 100% of users see
  a clear next-step message offering both "try again" and "enter by hand" — no
  silent failures, no blank screens.
- **SC-004**: At least 70% of voice-captured brew entries are saved with no more
  than 1 field correction, indicating extraction is trustworthy enough to feel
  effortless.
- **SC-005**: Brew log entries remain viewable on the device for 100% of test
  sessions across app close, device restart, and offline conditions (no data
  loss).
- **SC-006**: A user can complete the full log-a-brew flow (open coffee → record
  → review → save) in under 45 seconds on a typical mobile device.
- **SC-007**: On a device where speech recognition is unavailable, 100% of
  attempts to log a brew reach a usable manual-entry form rather than a dead
  end.
- **SC-008**: For brew notes where the user states both a dose and a water
  amount, the displayed ratio matches the stated values in 100% of cases.

## Assumptions

These reasonable defaults have been used to fill gaps in the brief and may be
revisited in `/speckit-clarify` or the implementation plan:

- **Capture model**: A brew is captured as a single free-form spoken
  utterance parsed all at once (not a guided field-by-field voice prompt). This
  matches the "speak a brew note over a fresh pour" framing.
- **Units**: Specialty-coffee domain standards are assumed — temperature in
  degrees Celsius, dose and water in grams, time in minutes/seconds. Spoken
  numbers without explicit units are interpreted by these defaults and remain
  editable.
- **Ratio handling**: Ratio is normally derived from dose and water. A directly
  spoken ratio is captured, but when dose and water are also present they are
  authoritative and the ratio is recomputed from them.
- **Entry-coffee relationship**: Brew entries always belong to exactly one
  existing saved coffee; there is no standalone brew log unattached to a coffee
  in v1, and brews do not outlive their coffee (cascade delete).
- **Editing & deletion**: Every field is tappable to edit, and individual brew
  entries can be deleted (hard delete, no recycle bin), consistent with the
  coffee-deletion behavior in feature 001.
- **Pre-save durability deferred**: An in-review brew entry that has not been
  saved is held only in memory; a session kill before tap-Save loses it and the
  user re-records. The save itself is atomic. See FR-022.
- **Scope exclusion**: This feature does not add brewing *recommendations* or
  dial-in *suggestions* (e.g., "try a finer grind next time") — it captures and
  recalls what the user actually did. Suggestion features are deferred.
- **BYOK & mobile-first**: Consistent with the constitution, structured
  extraction uses the user's own provided key, and every screen in this flow is
  designed and verified at mobile viewport widths first.
