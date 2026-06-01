# Feature Specification: Scan Bag to Coffee Card

**Feature Branch**: `001-scan-bag-to-card`

**Created**: 2026-05-30

**Status**: Draft

**Input**: User description: "photograph a bag → coffee card"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture a bag and see its coffee card (Priority: P1)

A user has a bag of specialty coffee in hand. They open the app, point the
camera (or pick a photo from their gallery) at the bag's label, and within a
few seconds see a clean coffee card on screen showing the structured
information lifted from the label — roaster, origin, variety, process, roast
level, and tasting notes. They can correct anything that looks wrong before
moving on.

**Why this priority**: This is the irreducible hero moment of the product — "I
held up a bag, the app understood it." Without this, nothing else exists.
Everything downstream (saving, enrichment, brew logging) builds on this single
flow.

**Independent Test**: With the app open on a phone, photograph a real
specialty coffee bag and verify that a coffee card appears within a reasonable
time, populated with at least the roaster, origin, and tasting notes lifted
from the visible label. No save or history features are required for this test.

**Acceptance Scenarios**:

1. **Given** a user has the app open on a mobile device and the camera is
   ready, **When** they photograph the label side of a specialty coffee bag,
   **Then** within a short waiting period they see a coffee card showing the
   roaster, coffee name, origin, variety, process, roast level, and tasting
   notes that appeared on the label.
2. **Given** a user has an existing photo of a coffee bag in their device
   gallery, **When** they select that photo from within the app, **Then** the
   same coffee card appears as if they had just taken the photo live.
3. **Given** a coffee card has been generated, **When** the user notices a
   field is wrong or missing, **Then** they can edit any field directly on the
   card before proceeding.
4. **Given** the label is partially unreadable (one or more fields could not
   be extracted with confidence), **When** the card is shown, **Then** those
   fields appear explicitly empty (not fabricated) and are clearly marked so
   the user can fill them in manually.
5. **Given** the photo is too blurry, too dark, or shows no readable label,
   **When** the system cannot extract anything meaningful, **Then** the user
   sees a friendly, actionable message ("Couldn't read the label — try a
   clearer photo, or enter the coffee manually") with both options reachable
   in one tap.

---

### User Story 2 - Save a coffee and revisit it later (Priority: P2)

After reviewing the coffee card, the user can save it. The coffee then lives
on the user's device permanently — they can open the app days or weeks later,
find that coffee in a list of their saved coffees, and view its full card
again. Saving works offline; revisiting works offline.

**Why this priority**: A scan flow without persistence is a demo. Saving turns
the app into a real personal coffee library — the foundation that brew logging
will later attach to.

**Independent Test**: Save a freshly scanned coffee, close the app fully,
reopen it (ideally with network disabled), and verify the saved coffee appears
in the list and its card can be viewed exactly as captured.

**Acceptance Scenarios**:

1. **Given** a freshly generated coffee card with at least one extracted
   field, **When** the user taps Save, **Then** the coffee is recorded on the
   device and the user is taken to that coffee's permanent page.
2. **Given** previously saved coffees exist on the device, **When** the user
   opens the app, **Then** they see a list of their saved coffees with enough
   identifying detail (roaster + coffee name) to recognise each one.
3. **Given** the device has no network connectivity, **When** the user opens
   the app and selects a previously saved coffee, **Then** its full coffee
   card displays without error.
4. **Given** the user has saved a coffee, **When** they later open that
   coffee's page, **Then** the displayed card matches what was saved
   (including any edits they made before saving).

---

### User Story 3 - Enrich the coffee card with deeper context (Priority: P3)

Once the basic card is captured, the system layers in context that goes
beyond what was printed on the label: a short origin story for the region or
farm, any well-known facts about the producer or variety, and suggested brew
starting points (method, ratio range, grind notes). This enrichment is
attached to the same coffee card and persists with it.

**Why this priority**: This is the difference between a label-scanner and a
discovery companion. Important for the product vision, but the product is
usable without it for early users.

**Independent Test**: For a saved coffee whose origin is well-known (e.g., a
named Ethiopian washing station or a single-estate Guatemala), confirm that
the card now shows a short, plausible origin story and one or more concrete
brew recommendations. Verify these persist after closing and reopening the
app.

**Acceptance Scenarios**:

1. **Given** a coffee has been successfully extracted and saved with a
   recognisable origin and producer, **When** enrichment completes, **Then**
   the card shows additional sections for origin story, producer/farm
   context (if available), and at least one suggested brew approach.
2. **Given** the origin or producer is obscure or unverifiable, **When**
   enrichment runs, **Then** the system leaves the enrichment sections
   empty (or marked "no additional context available") rather than
   fabricating details.
3. **Given** enrichment has previously completed for a coffee, **When** the
   user revisits that coffee's page offline, **Then** the enriched sections
   display from local storage without requiring a fresh network call.

---

### Edge Cases

- The label is in a non-Roman script (Japanese, Korean, Arabic) — the user
  still gets a card, with fields populated where the system can transliterate
  or translate, and the original-language values preserved where it cannot.
- The bag has no traditional label (e.g., minimalist or sample-bag design
  with only a sticker) — the system extracts whatever fields it can find and
  leaves the rest empty.
- The user photographs the back of the bag instead of the front — the system
  extracts whatever is visible; if nothing useful is on that face, the
  failure-handling flow (Story 1, scenario 5) kicks in.
- The user takes multiple shots of the same bag in succession — each shot
  produces a fresh card; the system does not attempt to detect duplicates in
  v1, so the user may end up with multiple entries for the same coffee.
- The user backgrounds the app mid-extraction — when they return, either the
  card finishes loading or they see a clear "try again" state; no partial,
  half-extracted card is silently saved.
- Camera permission is denied — the gallery-upload path remains available
  and the manual-entry fallback remains available.

## Requirements *(mandatory)*

### Functional Requirements

**Capture & extraction (Story 1)**

- **FR-001**: Users MUST be able to capture a photo of a coffee bag using the
  device camera from within the app.
- **FR-002**: Users MUST also be able to select an existing photo from the
  device gallery as the source image.
- **FR-003**: System MUST process the source image and produce a coffee card
  containing, at minimum, slots for: roaster, coffee name, origin, variety,
  process, roast level, and tasting notes.
- **FR-004**: System MUST present the extracted card to the user without
  persisting it first; the user reviews before saving.
- **FR-005**: System MUST mark any field that could not be confidently
  extracted as explicitly empty (and visually distinguished), and MUST NOT
  invent plausible-looking values for missing fields.
- **FR-006**: Users MUST be able to edit any field on the card before saving.
- **FR-007**: When extraction fails entirely (no useful fields), the system
  MUST surface a clear, one-screen message that offers both "try another
  photo" and "enter manually" as one-tap options.
- **FR-008**: System MUST surface a recognisable in-progress state from the
  moment the photo is captured until the card is rendered (or failure shown).

**Persistence (Story 2)**

- **FR-009**: Users MUST be able to save a reviewed card to their device.
  Save MUST succeed even when the device has no network connectivity.
- **FR-010**: System MUST present a list of all saved coffees on the user's
  device, with each item showing enough identifying detail (roaster + coffee
  name at minimum) to be distinguishable from others.
- **FR-011**: Each saved coffee MUST have a permanent page on which its full
  card is displayed; this page MUST be reachable offline.
- **FR-012**: Saved coffees MUST persist across app closes, device restarts,
  and offline sessions.
- **FR-013**: The save operation itself MUST be atomic — once the user taps
  Save, either the full record lands in the device's local store, or
  nothing does (no partial coffees). Pre-save state (the in-memory
  ExtractedCoffee + photo between extraction and tap-Save) is NOT durable
  in v1: if the browser tab is killed by the OS while the user is reviewing,
  the user re-captures. A future feature ("draft coffees") may add a
  crash-safe intermediate store; out of scope here.

**Enrichment (Story 3)**

- **FR-014**: After a coffee is successfully saved, the system MUST attempt
  to enrich the card with additional context: an origin story, any known
  producer/farm details, and at least one suggested brew approach.
- **FR-015**: Enrichment MUST be additive only — it MUST NOT overwrite
  fields the user explicitly entered or edited.
- **FR-016**: When no reliable enrichment is available for a field, the
  system MUST leave that enrichment slot empty (or marked "no additional
  context available") rather than fabricating content.
- **FR-017**: Enriched content MUST be persisted with the coffee and
  available offline on subsequent views.

**Cross-cutting**

- **FR-018**: All primary actions in this flow (capture, review/edit, save,
  open a saved coffee) MUST be usable one-handed on a mobile device.
- **FR-019**: Users MUST be able to delete a saved coffee from their device.
- **FR-020**: If the user denies camera permission, the gallery-upload and
  manual-entry paths MUST remain fully available; the app MUST NOT be
  bricked behind a camera-permission wall.

### Key Entities

- **Coffee Card**: The user-facing representation of a single coffee. Holds
  the extracted label fields (roaster, coffee name, origin, variety, process,
  roast level, tasting notes), the source image reference, capture timestamp,
  and (once enriched) origin story, producer/farm context, and brew
  recommendations. The same entity is shown both immediately after capture
  and on the coffee's permanent page.
- **Saved Coffee**: A Coffee Card the user has explicitly chosen to keep.
  Persists on the device until the user deletes it. The unit listed on the
  user's library page.
- **Extraction Result**: The structured output of running the AI vision flow
  on a source image. Either becomes a Coffee Card on success, or triggers
  the failure flow when nothing useful was extracted. Distinguishes "field
  was not on the label" from "field could not be read with confidence" so
  the user can act accordingly.
- **Enrichment Result**: The additional context attached to a saved coffee
  after the fact. Logically separate from the Extraction Result so the user
  can tell which information came from the bag versus which was added by the
  system.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a clear photo of a typical specialty coffee bag, the user
  sees a populated coffee card within 10 seconds of taking the photo, in 90%
  of attempts.
- **SC-002**: Across a representative sample of **at least 5** specialty
  coffee bags photographed in good lighting (covering different roaster
  styles, processes, and origins), at least 80% of the visible label fields
  (roaster, coffee name, origin, variety, process, roast level, tasting
  notes) are extracted correctly on the first attempt. A larger 30-bag
  accuracy bar is promoted to a v2 quality goal.
- **SC-003**: When extraction cannot read any field with confidence, 100%
  of users see a clear next-step message offering both "try another photo"
  and "enter manually" — no silent failures, no blank screens, no dropped
  state.
- **SC-004a**: At least **60%** of cards the user saves are saved with
  zero edits to extracted fields — indicating extraction is good enough
  to feel effortless.
- **SC-004b**: At least **95%** of cards the user saves are saved with
  no more than 2 field edits — indicating extraction is consistently
  close enough to feel trustworthy, even when minor touch-ups are needed.
- **SC-005**: Saved coffees remain viewable on the device for 100% of test
  sessions across app close, device restart, and offline conditions (no
  data loss).
- **SC-006**: Users can complete the full capture-to-saved-coffee flow
  (open app → photo → review → save) in under 60 seconds on a typical
  mobile device.
- **SC-007**: For coffees with a well-known origin or producer, enrichment
  produces at least one origin-story sentence and at least one concrete
  brew recommendation in 70% of cases; for obscure or unverifiable origins,
  enrichment leaves the section empty 100% of the time (no fabrication).

## Assumptions

These reasonable defaults have been used to fill gaps in the brief and may be
revisited in `/speckit-clarify` or the implementation plan:

- **Input sources**: Both live camera capture and gallery upload are
  supported for v1. Camera is the primary, first-class entry point; gallery
  is a convenience fallback.
- **Field set**: The card's structured fields are exactly those named in the
  product brief — roaster, origin, variety, process, roast level, tasting
  notes — plus an implicit "coffee name" field (the product name as printed
  on the bag), since it's the natural primary identifier and is almost
  always present on specialty bags.
- **Editability**: Users can correct any extracted field on the review
  screen before saving. This is treated as standard UX, not a feature
  requiring separate justification.
- **Duplicate handling**: v1 does not detect duplicates. Photographing the
  same bag twice yields two separate entries, which the user can delete
  manually. Duplicate detection is deferred.
- **Enrichment timing**: Enrichment runs automatically immediately after a
  coffee is saved (not on-demand), so the user sees a richer card the next
  time they open it. The cost implication of this auto-trigger is
  acknowledged and will be measured per the constitution's observability
  principle.
- **Failure messaging**: A single tone ("couldn't read the label — try a
  clearer photo, or enter manually") covers all extraction-failure cases;
  we do not distinguish between "blurry," "no label visible," and "label in
  unsupported script" in the user-facing message.
- **Manual entry**: A manual-entry path (no photo required) is available as
  the fallback for failed extraction and for cases where the user denies
  camera permission. It produces the same Coffee Card entity, simply
  without a source image.
- **Deletion**: Users can delete a saved coffee. Deletion is hard delete in
  v1 (no recycle bin); brew-log retention concerns will be revisited when
  that feature lands.
- **Scope exclusion**: This feature does NOT cover brew logging (voice or
  otherwise) — that is its own feature. The coffee card produced here is
  the surface that future brew logs will hang off.
- **Pre-save durability deferred**: A captured coffee that has not yet been
  saved is held only in memory in v1. Tab-kill between extraction and
  tap-Save loses the capture — the user re-shoots. The save itself is
  atomic. See FR-013.
