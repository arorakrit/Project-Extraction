# Feature Specification: Cup'd Brand UI Refactor

**Feature Branch**: `004-cupd-brand-refactor`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "using the cupd-brand-board html page in local, refactor the UI"

## Context

The repository contains a finished brand-direction page, `cupd-brand-board.html`, that defines the
product's visual identity under the name **Cup'd**. This feature applies that identity to the
existing app. The brand board is the source of truth and specifies:

- **Palette — "Cupping Room After Dark"** (a dark identity): Ink (deep base), Slate (elevated
  surfaces/cards), Bone (text), Bone-dim (secondary text), and **Jade** as the signature accent
  ("use sparingly"). A warmer clay alternative is explicitly rejected ("hold jade").
- **Type system**: a display face for headlines / the wordmark / coffee names, a body face for
  copy and UI text, and a **monospace** face for all data (ratings, ratios, temperatures, tags,
  timestamps).
- **The Cup'd wordmark** (with a jade apostrophe) and a **second-person, knowing-not-snobbish
  voice** ("What did you cup today?", never gamified hype like "Trending 🔥").
- **A card anatomy** (the "log card"): elevated surface with a jade edge accent, a display-font
  coffee name, a roaster/origin/process line, a rating shown as "X.X / 5.0" in mono, mono
  flavour-tag pills, a venue label with a location marker, and a mono timestamp.

This is a **presentation-only** refactor: the look, typography, and voice of the existing screens
change; data, persistence, AI behaviour, and feature functionality do not.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The app looks like Cup'd everywhere (Priority: P1)

A user opens the app and every screen presents the dark Cup'd identity: the Ink background, Bone
text, the brand typefaces, data rendered in monospace, and jade used as a deliberate accent. The
prior light, system-font appearance is gone.

**Why this priority**: This is the foundation — a shared visual system (palette + typefaces + data
treatment) applied app-wide. Without it nothing else reads as Cup'd, and once it lands every screen
already shifts to the brand at a baseline level. It is the smallest change that delivers a
recognisably re-branded product.

**Independent Test**: Open each existing screen (home/scan, library, drinks history, coffee detail,
settings) and confirm a dark Ink background, Bone text, display-font headings, body-font copy,
monospace data values, and jade accents — with no screen retaining the old light background or
system font.

**Acceptance Scenarios**:

1. **Given** any screen, **When** it renders, **Then** the background is the Ink base, surfaces sit
   on Slate, and text is Bone / Bone-dim per role.
2. **Given** any heading or coffee name, **When** it renders, **Then** it uses the display typeface;
   body copy uses the body typeface.
3. **Given** any data value (a rating, timestamp, ratio, temperature, or tag), **When** it renders,
   **Then** it uses the monospace typeface.
4. **Given** the app is launched with no network connection, **When** any screen renders, **Then**
   the brand typefaces still display (they are not network-dependent).

---

### User Story 2 - Coffee and drink cards carry the brand (Priority: P2)

When a user views their drink history or a coffee, each entry is presented as the Cup'd "log card":
an elevated slate surface with a jade edge accent, the coffee name in the display face, a
roaster/origin/process line, the rating as "X.X / 5.0" in mono, flavour tags as mono pills, the
venue with a location marker, and a mono timestamp.

**Why this priority**: The card is the brand board's hero surface — "one card carries all three
pillars." It is where the identity is most visible and most repeated, but it builds on the US1
foundation.

**Independent Test**: Open the drinks history and a coffee detail; confirm each card matches the
brand card anatomy (slate surface, jade edge, display-font name, mono rating "X.X / 5.0", mono tag
pills, venue marker, mono time).

**Acceptance Scenarios**:

1. **Given** a logged drink, **When** its card renders, **Then** the coffee name is in the display
   face and the rating reads as "X.X / 5.0" in mono.
2. **Given** a card with flavour tags, **When** it renders, **Then** the tags are mono, uppercase,
   pill-shaped chips.
3. **Given** a card with a venue, **When** it renders, **Then** the venue appears with a location
   marker and the timestamp is in mono.
4. **Given** a card, **When** it renders, **Then** it sits on a slate surface with a single jade
   edge accent.

---

### User Story 3 - Cup'd identity and voice in the app chrome (Priority: P2)

The app presents itself as **Cup'd**: the wordmark (with jade apostrophe) is the app's identity,
navigation and primary actions are restyled to the brand, and key copy moments (greetings, empty
states, prompts) speak in the second-person Cup'd voice rather than generic review-app language.

**Why this priority**: Naming and voice complete the rebrand and are what make the product feel like
Cup'd rather than a recoloured generic app — but they layer on top of the visual foundation.

**Independent Test**: Launch the app and inspect the header/identity, navigation, and at least one
empty state; confirm the Cup'd wordmark is shown and copy uses the second-person voice (e.g. "What
did you cup today?") with none of the prohibited gamified phrasings.

**Acceptance Scenarios**:

1. **Given** the app's identity surface, **When** it renders, **Then** the Cup'd wordmark is shown
   with the jade apostrophe and the previous product name is no longer user-visible.
2. **Given** an empty state (e.g. no drinks logged yet), **When** it renders, **Then** the copy uses
   the second-person Cup'd voice.
3. **Given** any primary action or selected state, **When** it renders, **Then** jade is the
   highlight, applied sparingly, and primary actions are clearly distinguished from secondary ones.

---

### User Story 4 - Branded inputs and controls (Priority: P3)

Forms and controls — the log-a-drink form, manual entry, the star rating, the flavour-tag picker,
the venue field, and settings — adopt the brand: slate input surfaces, mono labels for data fields,
jade selection/active states, and brand-styled chips, while remaining fully usable on a phone.

**Why this priority**: Inputs are used less continuously than viewing surfaces and can adopt the
brand last without blocking the rest of the rebrand.

**Independent Test**: Open the log-a-drink form on a phone-width viewport; confirm controls reflect
the brand (jade selection states, mono data labels, slate fields, pill flavour chips) and every
target is still at least 44×44 with no horizontal scrolling.

**Acceptance Scenarios**:

1. **Given** the flavour-tag picker, **When** a tag is selected, **Then** the selected state uses
   jade and tags render as mono pills.
2. **Given** the star rating control, **When** stars are filled, **Then** the fill uses the brand
   accent treatment.
3. **Given** any form field, **When** it renders at 320–430px width, **Then** it is fully usable
   with a ≥44×44 touch target and no horizontal scrolling.

---

### Edge Cases

- **Web-font load failure / first paint**: if a brand typeface is unavailable, text MUST fall back
  to a readable system equivalent without breaking layout.
- **Reduced motion**: decorative motion (e.g. reveal animations) and texture MUST be suppressed or
  minimised when the user prefers reduced motion.
- **Contrast on dim text**: secondary (Bone-dim) text MUST still meet contrast minimums against Ink;
  if a brand-board value fails, it MUST be adjusted to pass.
- **Long coffee names** in the display face MUST wrap or truncate gracefully without overflowing the
  card or the viewport.
- **Forced light mode at the OS level**: the app presents its single dark identity regardless; it
  MUST NOT render a broken half-light state.
- **Very small screens (≤320px)**: all branded surfaces remain usable without horizontal scrolling.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All app surfaces MUST use the Cupping Room After Dark palette — Ink as the base,
  Slate for elevated surfaces/cards, Bone and Bone-dim for text by role, and Jade as the accent.
- **FR-002**: The app MUST present a single dark theme as its canonical identity; the previous
  light/system-driven theme is retired.
- **FR-003**: Headings, the wordmark, and coffee names MUST use the display typeface; body copy and
  general UI text MUST use the body typeface; all data values (ratings, ratios, temperatures, tags,
  timestamps) MUST use the monospace typeface.
- **FR-004**: The Cup'd wordmark (with jade apostrophe) MUST be the app's user-facing identity,
  replacing the prior product name in visible chrome.
- **FR-005**: Coffee and drink cards MUST follow the brand card anatomy: a slate elevated surface
  with a single jade edge accent, a display-font coffee name, a secondary roaster/origin/process
  line, a rating rendered as "X.X / 5.0" in mono, mono flavour-tag pills, a venue label with a
  location marker, and a mono timestamp.
- **FR-006**: Flavour tags and comparable data chips MUST render as mono, uppercase, pill-shaped
  elements.
- **FR-007**: Interactive elements (primary/secondary buttons, links, selected and focused states)
  MUST use jade as the highlight, applied sparingly per the brand guidance, with primary actions
  visually distinct from secondary.
- **FR-008**: All touch targets MUST remain ≥44×44 and every screen MUST stay usable at ≤430px
  width with no horizontal scrolling (preserving the mobile-first guarantee).
- **FR-009**: The brand typefaces MUST be available without network access so the identity holds
  fully offline.
- **FR-010**: Key copy moments (greeting, empty states, prompts, primary calls to action) MUST use
  the second-person, knowing-not-snobbish Cup'd voice and MUST avoid prohibited gamified phrasings.
- **FR-011**: All text MUST meet WCAG AA contrast against its background (≥4.5:1 for body text,
  ≥3:1 for large text); any brand value that fails MUST be adjusted to pass.
- **FR-012**: Decorative motion and texture MUST respect the user's reduced-motion preference and
  MUST NOT impair readability or responsiveness.
- **FR-013**: The refactor MUST NOT change data, stored records, AI behaviour, or feature
  functionality; all existing flows (scan a bag, log a drink, voice brew note, browse, settings)
  MUST continue to work unchanged.
- **FR-014**: The brand MUST be applied through one shared, consistent set of visual definitions so
  it renders uniformly across surfaces, with no off-brand legacy colours or fonts remaining.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of app screens render with the dark brand palette and brand typefaces — no
  screen retains the previous light background or system font.
- **SC-002**: 100% of user-facing data values (ratings, timestamps, tags, ratios, temperatures)
  display in the monospace style wherever they appear.
- **SC-003**: 100% of body text meets WCAG AA contrast (≥4.5:1) and large text ≥3:1, verified on
  every screen.
- **SC-004**: The full visual identity, including typefaces, renders correctly with no network
  connection in 100% of cases.
- **SC-005**: 100% of existing user flows complete successfully after the refactor, with zero
  functional regressions.
- **SC-006**: Every interactive control retains a ≥44×44 touch target and every screen is usable
  without horizontal scrolling across 320–430px widths.
- **SC-007**: A first-time viewer can identify the product as "Cup'd" from the app's identity within
  the first screen.
- **SC-008**: With reduced-motion enabled, no non-essential animation plays.

## Assumptions

- **Full brand adoption (not visuals only)**: "Refactor the UI using the brand board" is taken to
  mean adopting the complete identity — palette, typefaces, data treatment, the Cup'd wordmark in
  the app's chrome, and the second-person voice in key copy. If only the visual system (colours and
  type) was intended, that can be narrowed in `/speckit-clarify`.
- **Dark-only**: the "Cupping Room After Dark" palette is the single canonical theme; the existing
  light / `prefers-color-scheme` theme is retired (the brand is explicitly "dark mode, precise").
- **Jade accent**: jade is the signature accent; the clay/ember alternative is not used, per the
  brand board's "hold jade" recommendation.
- **Typefaces**: the display, body, and monospace faces named on the brand board (Bricolage
  Grotesque, Hanken Grotesk, JetBrains Mono) are used and made available offline rather than
  fetched from a third-party font CDN at runtime, to satisfy the offline guarantee.
- **Presentation-only**: no changes to the data model, local persistence, AI calls, or feature
  behaviour; this restyles the existing screens (home/scan, library, drinks history, coffee detail,
  log-a-drink, settings) and their shared components.
- **UI-facing rename**: the Cup'd name applies to user-visible surfaces; internal identifiers
  (package name, repository/spec history) need not change for this feature.
- **Brand flourishes are optional**: secondary motifs from the board (film-grain texture, the hero
  ripple) may be applied in-app but are subordinate to readability and performance and can be
  omitted without failing this spec.

## Dependencies

- `cupd-brand-board.html` (repository root) is the authoritative source for the palette, type
  system, card anatomy, wordmark, and voice.
- Builds on the existing screens and components delivered by features `001`, `002`, and `003`,
  which this refactor restyles without changing their behaviour.
