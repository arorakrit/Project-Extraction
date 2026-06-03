# Phase 0 Research: Voice Brew-Logging

**Feature**: 002-voice-brew-logging
**Date**: 2026-06-02

This feature inherits every framework-level decision from 001 (Vite SPA, BYOK via
Settings → IndexedDB, `idb` wrapper, Claude tool use + Zod, max-1-retry, dev
telemetry HUD). No constitution TODOs remain open. Research below is limited to
the genuinely new questions this feature raises.

---

## Decision 1: Voice capture via the Web Speech API (browser-native), no library

**Decision**: Use the browser-native Web Speech API
(`window.SpeechRecognition ?? window.webkitSpeechRecognition`) directly, wrapped
in `src/lib/speech.ts`. Add `@types/dom-speech-recognition` as a dev-only
dependency for TypeScript typings. No third-party speech library.

**Rationale**:
- The constitution mandates the Web Speech API for voice capture (Section 2,
  Technology Constraints). This feature is the one it was anticipating.
- It is zero-runtime-bytes: the API ships with the browser. A library would add
  bundle weight against the mobile cold-start budget for no capability gain.
- The wrapper isolates the vendor-prefixed global and the event model
  (`onresult`, `onerror`, `onend`) behind a small Promise-returning surface
  (`transcribeOnce(): Promise<string>`), keeping the React components clean and
  the availability check (`isSpeechRecognitionAvailable()`) unit-testable by
  stubbing the global constructor.

**Alternatives considered**:
- *MediaRecorder + a cloud STT (Whisper, Deepgram)*: better accuracy and true
  offline-record-then-upload, but introduces a second network dependency, a
  second key/secret, and contradicts the constitutional Web Speech API choice
  (would require an amendment). Rejected for v1.
- *A speech npm wrapper (e.g., react-speech-recognition)*: thin convenience over
  the same API at the cost of bundle size and an abstraction we'd have to learn;
  our needs are a single-shot transcription, so a ~40-line local wrapper wins.

---

## Decision 2: Offline & failure behavior — never lose the spoken note

**Decision**: Treat voice capture + AI structuring as an online-only happy path,
with the **manual entry form as the universal fallback**, and always preserve the
raw transcript. Specifically:
- If `isSpeechRecognitionAvailable()` is false → present the manual form directly
  (FR-017).
- If recognition succeeds but the `structure_brew_note` call fails (offline, network,
  or schema error) → open the manual form **pre-filled with the raw transcript as
  the tasting note**, so the user keeps what they said and can finish by hand.
- If recognition yields a transcript that structures to an all-null brew
  (`isEmptyBrew`) → the "didn't catch that — try again / enter by hand" message
  (FR-008), with the transcript still recoverable into the manual form.

**Rationale**:
- The Web Speech API generally requires network (most browsers stream audio to a
  cloud recognizer), so true offline voice capture is not dependable. Rather than
  promise offline voice, we guarantee the thing that matters under Principle IV:
  **no data loss**, and **all reads of saved brews work offline**.
- The constitution's "queue offline transcripts for later structuring" guarantee
  is satisfied in spirit: a transcript that can't be structured is never
  discarded — it becomes editable manual-entry content immediately. A
  background re-structuring queue is a possible future enhancement, explicitly
  out of v1 scope.

**Alternatives considered**:
- *Block brew logging entirely when offline*: violates Principle IV (manual
  reads/writes should work offline) and the spec's graceful-degradation
  requirement. Rejected.
- *Persist a "pending" brew and auto-retry structuring later*: real value but
  adds a queue, a background trigger, and a new entry state. Deferred; the
  pre-filled manual form delivers the no-loss guarantee without that machinery.

---

## Decision 3: Brew ratio is derived, not primary — with a spoken-ratio fallback

**Decision**: Model `dose_g` and `water_g` as the primary captured quantities and
**derive the ratio** for display via `deriveRatio(dose_g, water_g)` in
`src/lib/ratio.ts` (returns the water-parts-per-1-part-coffee number, e.g. `16`
for a 1:16 brew, rounded to one decimal). The Zod schema also carries an optional
`ratio: number | null` to capture a **spoken** ratio when the user states one
without a dose/water pair. Resolution rule (also encoded in the prompt and the
effective-merge): when both `dose_g` and `water_g` are present they are
authoritative and the displayed ratio is recomputed from them; the standalone
`ratio` field is only surfaced when the pair is incomplete.

**Rationale**:
- Matches how baristas actually talk: most say "18 in, 300 out" (a pair) but some
  say "1 to 16" (a ratio). Capturing both shapes and making dose/water
  authoritative avoids contradictory displays (spec edge case) and satisfies
  FR-006 and SC-008 ("displayed ratio matches the stated dose/water in 100% of
  cases").
- Keeping derivation in a pure helper makes it trivially unit-testable
  (`ratio.test.ts`) and reusable by both voice and manual entries (FR-019).

**Alternatives considered**:
- *Store only a ratio string ("1:16")*: loses the dose/water the user actually
  stated and forces string parsing for any math. Rejected.
- *Store only dose/water and never accept a spoken ratio*: would drop a value the
  user explicitly said when they didn't give a pair. Rejected in favor of the
  optional `ratio` fallback.

---

## Decision 4: Brew entity mirrors the Coffee `extracted` / `user_edits` split

**Decision**: A `BrewLogEntry` stores the AI's structured view (`structured`),
the user's overrides (`user_edits: Partial<StructuredBrew>`), a `source`
(`'voice' | 'manual'`), the raw `transcript` (for voice; `null` for manual), a
`logged_at` timestamp, and `coffee_id`. An `effectiveBrew(entry)` helper merges
edits over structured — exactly the pattern `effectiveExtractedCoffee` uses for
coffees in `src/store/coffees.ts`.

**Rationale**:
- Consistency with the proven 001 model: keeping the immutable AI output separate
  from user edits preserves provenance (Principle II — you can always tell what
  the model said vs. what the user changed) and reuses a pattern the codebase and
  tests already understand.
- `source` + `transcript` make voice vs. manual entries distinguishable for
  telemetry and for the "didn't catch that" recovery path, without a separate
  table.

**Alternatives considered**:
- *Flat record with a single mutable field set*: simpler to write but loses the
  AI-vs-user provenance the constitution values and diverges from the coffee
  model. Rejected for consistency.

---

## Decision 5: IndexedDB v2 — new `brews` store indexed by coffee, forward-only

**Decision**: Bump `DB_VERSION` from 1 to 2 in `src/store/db.ts`. In the
`oldVersion < 2` upgrade branch, create object store `brews` (keyPath `id`) with
one index `by_coffee` on `coffee_id`. The `coffees` and `settings` stores from v1
are left exactly as-is. Reads of a coffee's history use the `by_coffee` index;
the result is sorted `logged_at` descending in JS (small N per coffee).

**Rationale**:
- Forward-only, additive migration with no transform of existing rows — the
  safest shape under Principle IV's "versioned, forward-only" rule. A v1 database
  upgrades to v2 by simply gaining an empty store; no coffee data is touched.
- An index on `coffee_id` keeps the per-coffee timeline query O(matching rows)
  rather than a full scan, and supports the offline ≤ 200 ms detail-page goal.

**Alternatives considered**:
- *Embed brews as an array inside each `SavedCoffee` record*: avoids a second
  store but makes `coffees` rows unbounded, forces a read-modify-write of the
  whole coffee for every brew edit, and complicates the existing coffee schema
  (a v1→v2 transform of every row). Rejected — a separate indexed store is
  cleaner and keeps coffee writes cheap.

---

## Decision 6: One Claude call, reusing the existing tool-use wrapper

**Decision**: Add `structureBrewNote(transcript: string): Promise<StructuredBrew>`
to `src/ai/client.ts`, calling the existing generic `callClaudeTool` with a new
`record_brew_log` tool whose `input_schema` is derived from `StructuredBrewSchema`.
Extend `TelemetryRecord.call` with `'structure_brew_note'` and add an
`input_text_chars: number | null` field (image bytes are `null` for this
text-only call).

**Rationale**:
- The 001 `callClaudeTool` wrapper already centralizes BYOK key handling, the
  max-1-retry-on-schema-error policy, and telemetry. Routing the new call through
  it gets all three for free and keeps Principle II/V compliance in one place.
- Exactly one call per brew log keeps us far under the ≥ 3-call complexity
  threshold (Principle V) — no Complexity Tracking entry needed.

**Alternatives considered**:
- *A bespoke fetch for brew structuring*: would duplicate retry/telemetry/key
  logic and risk drift from the constitutional call contract. Rejected.

---

## Summary of resolved unknowns

| Unknown | Resolution |
|---------|------------|
| Voice capture mechanism | Browser-native Web Speech API, wrapped in `lib/speech.ts` |
| Offline / failure behavior | Manual form fallback; raw transcript always preserved |
| Ratio modeling | Derived from dose/water (authoritative); optional spoken-ratio fallback |
| Entity shape | `structured` + `user_edits` + `source` + `transcript`, mirroring coffees |
| Persistence | IndexedDB v2, new `brews` store, `by_coffee` index, forward-only |
| AI integration | One `structure_brew_note` call via existing `callClaudeTool` |

No `[NEEDS CLARIFICATION]` items remain. Proceed to Phase 1.
