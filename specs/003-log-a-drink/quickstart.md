# Quickstart: Log a Drink (003)

Manual verification of the feature once implemented. No API key, no network needed.

## Run

```bash
npm install
npm run dev          # open the printed localhost URL in a mobile viewport (≤ 430px)
```

Quality gates (must pass):

```bash
npm run typecheck    # tsc --noEmit
npm run lint
npm test             # vitest — includes drinks store + component tests
```

## Happy path — log in under 30 seconds (US1, SC-001)

1. From the home screen (`#/scan`), tap **Log a drink** — or tap the floating action button.
2. The form opens (`#/log`) with the star rating prominent.
3. Tap a star (e.g. 4).
4. Tap **Save**.
5. You land on **Drinks** (`#/drinks`) and the new entry is at the top, showing 4 stars and its
   logged time. ✅ Saved with only a rating, no account, no network.

## Venue type-ahead (US2)

1. Log a drink, type `WoC Brus` in the venue field, free-type `WoC Brussels` (no suggestion yet),
   set a rating, save.
2. Start a second log; type `WoC` in venue → **WoC Brussels** now appears as a suggestion within
   three characters (SC-005). Tap it.
3. Confirm both entries show the venue in history.

## Flavour tags — max three (US3, SC-007)

1. In the form, tap **Fruity**, **Bright**, **Chocolatey** → all three highlight.
2. Tap **Nutty** → it is **not** added (cap holds); the limit is indicated.
3. Tap **Bright** again → it deselects.
4. Save → only the selected tags appear on the history entry.

## Optional detail (US4)

1. Log a drink with a coffee name, an origin country, process = **Natural**, roast = **Light**.
2. Save → all provided values show on the entry.
3. Log another with only a rating → saves fine with no detail.

## Edge cases to confirm

- **No rating**: with no star selected, **Save** is blocked and the rating requirement is shown; no
  entry is created.
- **Offline**: disable network (DevTools offline) → logging, saving, and viewing history all still
  work.
- **Restart persistence**: reload the app → previously logged drinks are still listed.
- **Rapid logs**: log three drinks quickly → three distinct, correctly time-ordered entries.

## Constitution touchpoints

- **No AI call** is made anywhere in this flow (G2/G5 N/A) — confirm the dev token badge does not
  increment when logging a drink.
- **Mobile-first**: verify at ≤ 430px that the entry point, FAB, stars, and tags are all ≥ 44×44 and
  thumb-reachable. Attach a screenshot to the PR (Principle III gate).
- **Local-first**: the `drinks` IndexedDB store (DB v3) is the source of truth; everything above
  works with no network.
