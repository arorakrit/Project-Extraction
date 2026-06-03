# Quickstart: Voice Brew-Logging

**Feature**: 002-voice-brew-logging

This walks through verifying the feature end-to-end. It assumes 001 is in place
(you can scan/save a coffee) and a BYOK Anthropic key is configured in Settings.

---

## Prerequisites

- `npm install` (adds `@types/dom-speech-recognition` dev dependency).
- A BYOK Anthropic key saved in Settings (reused from 001).
- At least one saved coffee in the library (scan one via 001 if needed).
- **Chrome on Android or desktop Chrome** for the voice path (full Web Speech
  support). On iOS Safari, expect to verify the manual fallback path instead.

```bash
npm run dev
```

---

## Story 1 — Speak a brew note → structured entry (P1)

1. Open a saved coffee from the library (`#/coffee/:id`).
2. Tap **Log a brew** → **record**. Grant microphone permission if prompted.
3. Speak a natural note, e.g.:
   > "V60, eighteen grams in, three hundred grams out, medium-fine grind,
   > ninety-four degrees, two and a half minutes, really bright and floral with a
   > lemon finish."
4. Stop speaking. Within ~10 s a **review entry** appears with:
   - method **V60**, dose **18 g**, water **300 g**, ratio **1:16.7** (derived),
     grind **medium-fine**, temp **94 °C**, time **2:30** (150 s),
     tasting note captured.
5. Confirm any parameter you did **not** say shows as empty ("—"), not invented.
6. Tap any field to edit it; the ratio updates if you change dose or water.
7. Tap **Save**. You return to the coffee page and the entry appears at the top of
   the timeline.

**Pass criteria**: stated parameters land in the right fields (SC-002), the ratio
matches dose/water (SC-008), unstated fields are empty (FR-005), and the entry
persists in the timeline.

---

## Story 2 — Brew history over time (P2)

1. Log a second brew against the same coffee (vary it: "Same V60 but finer grind,
   one to fifteen, ninety-two degrees, three minutes, more syrupy").
2. Confirm the coffee page shows a **timeline**, newest first, each row showing at
   least method, ratio, grind, and the tasting note.
3. Fully close the app, disable network, reopen, open the same coffee.
   - The full brew history renders **offline** with no error (SC-005).
4. Tap a past brew, edit a field, save — the change shows in the timeline.
5. Delete a brew — it disappears and does not return after reload.
6. Open a coffee with **no** brews — confirm the empty state with a one-tap
   "log your first brew" action.

**Pass criteria**: history is ordered newest-first, fully readable offline,
editable, deletable, and the empty state is reachable in one tap.

---

## Story 3 — Manual fallback (P3)

1. **Unavailable-speech path**: in a browser without Web Speech (e.g. a desktop
   Firefox profile, or temporarily stub `window.SpeechRecognition`/
   `webkitSpeechRecognition` to `undefined` in DevTools), tap **Log a brew**.
   - The **manual form** appears directly — no broken record button (FR-017).
2. **Preference path**: on Chrome (voice available), choose **enter by hand** and
   fill the same fields; save. The entry is identical in kind to a voice one and
   appears in the timeline (FR-019).
3. **No-loss path**: with voice available but network **off**, record a note.
   Recognition still produces a transcript, the structuring call fails, and you
   land in the manual form **pre-filled with your spoken words** as the tasting
   note — nothing is lost (Principle IV).

**Pass criteria**: every route to logging a brew reaches a usable form (SC-007);
a spoken note is never discarded on failure.

---

## Sanity-check mobile-first UX

Per constitution Principle III, every UI-touching PR is checked at a mobile
viewport:

1. Chrome DevTools → device toolbar → iPhone 14 Pro (393 px) and Pro Max (430 px).
2. The **record** button, every editable field on the review/manual form, the
   **Save** button, and each timeline row are ≥ 44 × 44 CSS px.
3. Nothing requires hover or right-click.
4. Capture a screenshot at both widths for the PR description.

---

## Tests & gates

```bash
npm run typecheck && npm run lint && npm run test
```

Expected new tests:
- `tests/unit/ai/brew-schema.test.ts` — `StructuredBrew` validation, `isEmptyBrew`,
  and golden-fixture replay (no live Claude call).
- `tests/unit/store/brews.test.ts` — CRUD, `by_coffee` query ordering, and the
  cascade delete when a coffee is removed (via `fake-indexeddb`).
- `tests/unit/lib/ratio.test.ts` — `deriveRatio` rounding and missing-input cases.

---

## Troubleshooting

**Record button does nothing / no transcript**
- Web Speech may be unavailable in this browser — you should have been routed to
  the manual form. If not, check the console for a SpeechRecognition error.
- Microphone permission denied: re-enable it in the browser site settings; the
  manual form remains available meanwhile.

**"Didn't catch that" on a clearly-spoken note**
- The transcript structured to all-null. Try again, or use **enter by hand** —
  your words are preserved as the tasting note.

**Ratio looks wrong**
- Ratio is derived from dose ÷ water when both are present (dose/water are
  authoritative). If you only stated a ratio, that value is shown instead. Edit
  dose/water to recompute.

**Brew history missing after reopening**
- Confirm IndexedDB upgraded to **version 2** (DevTools → Application → IndexedDB
  → `project-extraction` should list a `brews` store with a `by_coffee` index).
