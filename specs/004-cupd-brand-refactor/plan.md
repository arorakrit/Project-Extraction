# Implementation Plan: Cup'd Brand UI Refactor

**Branch**: `004-cupd-brand-refactor` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-cupd-brand-refactor/spec.md`

## Summary

Re-skin the existing SPA to the **Cup'd** identity defined in `cupd-brand-board.html`: the dark
"Cupping Room After Dark" palette (Ink / Slate / Bone / Jade), a three-typeface system (display /
body / monospace), monospace treatment for all data, the branded "log card" anatomy, the Cup'd
wordmark, and a second-person voice. Presentation only — no data, persistence, or AI change.

The codebase makes this overwhelmingly a **token-first** change: every component already styles
itself through CSS custom properties from the single global `style.css` (no component hardcodes a
hex colour or font family — verified by grep). So the bulk of the palette + type rebrand is
achieved by **redefining the token values and adding font tokens in `style.css`**, with bundled
offline fonts. The remaining work is targeted, per-component: applying the display face to
headings/coffee names, the mono face to data, the card jade-edge/slate anatomy, the wordmark, and
voice copy.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict), React 18.3

**Primary Dependencies**: React + React DOM; **new (dev/runtime)**: self-hosted webfont packages
for the three brand faces (`@fontsource-variable/*`) so the identity works offline. No other new
deps.

**Storage**: Unchanged (IndexedDB via `idb`). This feature does not read or write data.

**Testing**: `tsc --noEmit`; eslint; `vitest` (existing suite must stay green — proves zero
functional regression). Visual/contrast/offline checks are manual via quickstart.md.

**Target Platform**: Mobile-first web (≤430px baseline), static Vite SPA.

**Project Type**: Single-project React + TypeScript SPA (existing `src/` layout).

**Performance Goals**: No regression to first paint; fonts must not block usable render (fallback
to system faces until loaded); decorative motion honours reduced-motion.

**Constraints**: Single dark theme; WCAG AA contrast; 44×44 touch targets; usable 320–430px with no
horizontal scroll; full identity (incl. fonts) renders offline.

**Scale/Scope**: Restyle of all current surfaces — `style.css` (token layer), `index.html`, and the
~18 components + 6 views from features 001–003. No new screens.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — still passing.*

- **G1. Spec lineage (Principle I)** — **PASS**. References `specs/004-cupd-brand-refactor/spec.md`
  from `/speckit-specify`. `/speckit-clarify` was optional and skipped; the spec carries zero
  `[NEEDS CLARIFICATION]` markers, with the two scope forks (full-rebrand, dark-only) resolved in
  Assumptions.
- **G2. AI schema-first (Principle II)** — **N/A**. No Claude `claude-sonnet-4-6` call is
  introduced or modified. This is a pure presentation refactor; AI schemas, prompts, and
  `tests/ai-fixtures/` are untouched.
- **G3. Mobile-first UX (Principle III)** — **PASS**. The refactor preserves the existing
  `--touch-target-min` (44px) contract and ≤430px layout, and adds explicit checks: every restyled
  surface is verified at 320–430px with 44×44 targets and no horizontal scroll. This gate is
  central to the feature (FR-008, SC-006).
- **G4. Local-first persistence (Principle IV)** — **PASS**. No store change; all read paths stay
  network-independent. The one network risk — the brand board loads fonts from a Google CDN — is
  explicitly removed by **bundling the fonts locally** (FR-009, SC-004), so the offline guarantee
  is preserved, not weakened.
- **G5. Observability & cost (Principle V)** — **N/A**. No Claude calls → nothing to instrument;
  telemetry untouched. The ≥3-calls rule is not triggered (0 calls).
- **G6. Technology constraints** — **PASS**. Stays within React + TypeScript + local store. Adding
  self-hosted font packages is a normal dependency choice, not a stack change (no backend, no model
  substitution). The constitution does not forbid new front-end dependencies.

**Result**: All applicable gates PASS; G2 and G5 are N/A (no AI). No deviations → Complexity
Tracking is empty.

## Project Structure

### Documentation (this feature)

```text
specs/004-cupd-brand-refactor/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output — the design-token model (no domain data)
├── quickstart.md        # Phase 1 output — visual/contrast/offline/regression QA
├── contracts/
│   └── brand-system.contract.md   # tokens + type roles + card anatomy + voice + per-surface checks
├── checklists/
│   └── requirements.md  # From /speckit-specify
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
style.css                # CORE CHANGE: redefine palette tokens to Cupping Room After Dark;
                         #   add --font-display/--font-body/--font-mono; retire the light/
                         #   prefers-color-scheme block; add brand utility classes
                         #   (.font-display, .data, .tag, .card, .card--accent); reduced-motion.
index.html               # MODIFY: <title> -> Cup'd; theme-color -> #121311.
src/main.tsx             # MODIFY: import the three bundled @fontsource-variable stylesheets.
package.json             # MODIFY: add @fontsource-variable/{bricolage-grotesque,hanken-grotesk,
                         #   jetbrains-mono}.

# Targeted component/view edits (type roles, card anatomy, wordmark, voice):
src/App.tsx              # Cup'd wordmark in chrome; nav restyle; FAB accent.
src/components/
├── DrinkCard.tsx        # log-card anatomy: slate + jade edge, display name, mono "X.X / 5.0",
│                        #   mono tag pills, venue marker, mono timestamp.
├── CoffeeCard.tsx       # same card anatomy applied to coffee detail.
├── CoffeeList.tsx       # list rows -> branded cards; display-font names; mono meta.
├── BrewTimeline.tsx     # brew entries -> mono data treatment + brand surfaces.
├── StarRating.tsx       # brand-accent fill (already token-driven; confirm jade).
├── FlavourTagPicker.tsx # mono uppercase pills; jade selected state.
├── ReviewCard / BrewReview / BrewFields / BrewEntryForm / BrewRecorder
│                        # display headings + mono data fields; slate surfaces.
├── ManualEntryForm / VenueInput / Settings / Scanner / ErrorState / LogDrinkEntry
│                        # type roles + jade states + second-person voice copy.
└── ...
src/views/
├── ScanView, LibraryView, DrinksView, CoffeeView, SettingsView
                         # display-font page titles; empty-state + prompt copy in Cup'd voice.
```

**Structure Decision**: Token-first. `style.css` is the single source of brand truth (satisfies
FR-014 — one shared definition, no off-brand legacy values). Component edits are limited to what
tokens cannot express: font-family *role* per element, the card jade-edge structure, the wordmark,
and voice copy. No new app directories (the `@fontsource` packages need none).

## Complexity Tracking

> No Constitution Check violations. No entries.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |
