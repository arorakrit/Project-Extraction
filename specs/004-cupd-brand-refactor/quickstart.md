# Quickstart: Cup'd Brand UI Refactor (004)

Manual verification of the rebrand. No API key needed for the visual checks (a BYOK key is only
needed to exercise the AI flows for regression).

## Run

```bash
npm install            # pulls the bundled @fontsource brand faces
npm run dev            # open the printed URL in a mobile viewport (≤430px)
```

Automated gates (must pass — they prove zero functional regression):

```bash
npm run typecheck      # tsc --noEmit
npm run lint
npm test               # vitest — existing suite stays green
npm run build          # production build succeeds
```

## Visual identity (US1, SC-001/SC-002)

1. Open each screen: **Scan/home, Library, Drinks, a Coffee detail, Settings**.
2. Confirm on every screen: Ink `#121311` background, Bone text, **display** font on titles/coffee
   names, **body** font on copy, and **mono** on all data (ratings, timestamps, tags, ratios,
   temperatures). Jade appears only as an accent, not as a surface.
3. Confirm **no** screen shows the old white background or system font.

## Branded cards (US2)

1. On **Drinks**, confirm each entry is a slate `.card` with a jade left edge, the coffee name in
   the display face, the rating as `X.X / 5.0` in mono (the `/ 5.0` dimmed), flavour tags as mono
   uppercase pills, the venue with a location marker, and a mono timestamp.
2. On a **Coffee detail**, confirm the same card anatomy and that brew-timeline data is mono.

## Identity & voice (US3, SC-007)

1. Confirm the **Cup'd** wordmark (jade apostrophe) is the app identity and the old "Project
   Extraction" name is gone from visible chrome; browser tab title reads Cup'd.
2. Open an empty state (e.g. no drinks yet) — copy uses the second-person Cup'd voice; no gamified
   phrasing.

## Branded inputs (US4, SC-006)

1. Open **Log a drink** at 320px and at 430px: no horizontal scrolling; every control ≥44×44.
2. Select flavour tags → jade selected state, mono pills. Set a star rating → brand-accent fill.

## Accessibility & resilience

- **Contrast (SC-003)**: spot-check body and meta text on every screen with a contrast tool —
  body ≥4.5:1, large ≥3:1.
- **Offline fonts (SC-004)**: DevTools → offline → hard reload → the three brand faces still render
  (served locally, not from a CDN).
- **Reduced motion (SC-008)**: enable "reduce motion" at the OS level → no reveal animations / grain
  motion play.
- **Font-load fallback**: throttle/deny the font files → text still renders in a readable system
  fallback without layout break.

## Regression (SC-005)

Exercise each existing flow end-to-end and confirm unchanged behaviour:
- Scan a bag → coffee card (needs BYOK key).
- Log a drink → appears in Drinks history.
- Voice brew note on a coffee → brew log on the timeline.
- Browse Library / Drinks; open Settings and save the key.

## Constitution touchpoints

- **No AI call** is added (G2/G5 N/A) — the dev token badge does not change during any branded view.
- **Mobile-first**: capture a ≤430px screenshot for the PR (Principle III gate).
- **Local-first**: the offline-fonts check above is the Principle IV guarantee for this feature.
