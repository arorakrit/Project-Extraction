<!-- SPECKIT START -->
**Project**: Project Extraction — a mobile-first specialty coffee discovery and
brew-logging app. React + TypeScript + Vite SPA. Claude `claude-sonnet-4-6` for
vision extraction and enrichment. IndexedDB for local-first persistence. BYOK
Anthropic key (no secrets in committed source; optional build-time key — see 005).

**Constitution**: [.specify/memory/constitution.md](.specify/memory/constitution.md) — v1.0.0,
ratified 2026-05-29. Five principles; II (AI Schema-First) and I (Spec-Driven)
are NON-NEGOTIABLE.

**Shipped**: `001-scan-bag-to-card` — photograph a bag → coffee card (merged to
`main`). Established the `src/` layout: `ai/` (tool-use + Zod schemas, telemetry,
retry), `store/` (IndexedDB via `idb`: `coffees` + `settings`), mobile-first
`components/` + `views/`, BYOK key in Settings. `002-voice-brew-logging` — speak a
brew note → structured brew log; added the `brews` store (`DB_VERSION` 2,
`by_coffee` index) and the `structure_brew_note` Claude call. `003-log-a-drink` —
fast manual drink logging → standalone `drinks` store (`DB_VERSION` 3) + `#/log`
form and `#/drinks` history (PR #5). `004-cupd-brand-refactor` — Cup'd brand
re-skin, dark-only token-first UI, offline `@fontsource-variable/*` faces (PR #6).
`005-build-time-api-key` — optional built-in Anthropic key via `VITE_ANTHROPIC_KEY`
in an untracked `.env`; `src/lib/apiKey.ts` `resolveApiKey()` precedence personal →
built-in → none; never set the var in Vercel (PR #7).

**Active feature**: `006-cafe-voice-drink-logging` — re-orient drink logging
around the café (venue field first; bean detail collapsed behind an expander;
history cards headline the café; venue-filtered routes `#/drinks/at/<venue>` +
`#/drinks/no-cafe`) and add voice logging for drinks: Web Speech transcript →
ONE `structure_drink_note` Claude call (tool `record_drink_log`, Zod
`VoiceDrinkDraftSchema` in `src/ai/schemas/drink.ts`) → draft prefills the same
café-first form for review; Save = explicit confirm via existing `makeDrinkLog`
→ `addDrink`. NO store/DB changes (`DB_VERSION` stays 3); rating stays the only
required field.
- Spec: [specs/006-cafe-voice-drink-logging/spec.md](specs/006-cafe-voice-drink-logging/spec.md)
- Plan: [specs/006-cafe-voice-drink-logging/plan.md](specs/006-cafe-voice-drink-logging/plan.md)
- Research (Phase 0): [specs/006-cafe-voice-drink-logging/research.md](specs/006-cafe-voice-drink-logging/research.md)
- Data model: [specs/006-cafe-voice-drink-logging/data-model.md](specs/006-cafe-voice-drink-logging/data-model.md)
- Quickstart: [specs/006-cafe-voice-drink-logging/quickstart.md](specs/006-cafe-voice-drink-logging/quickstart.md)
- Contracts: [specs/006-cafe-voice-drink-logging/contracts/](specs/006-cafe-voice-drink-logging/contracts/)

**006 key touchpoints** (per plan.md; enumerated as tasks by `/speckit-tasks`):
1. NEW `src/ai/schemas/drink.ts` (`VoiceDrinkDraftSchema`, `normalizeDrinkDraft`,
   `isEmptyDrinkDraft`) + `src/ai/prompts/drink.ts`; golden fixture under
   `tests/ai-fixtures/drink-structuring/`.
2. `src/ai/client.ts` + `structureDrinkNote()` / `DrinkDraftEmptyError`;
   `src/lib/telemetry.ts` + `'structure_drink_note'`; `src/lib/speech.ts` reused as-is.
3. `src/store/drinks.ts` + `listDrinksByVenue()`, `resolveVenueCasing()` (no schema change).
4. `DrinkLogForm` (café-first order, collapsed details, `initial` prefill prop),
   NEW `DrinkRecorder`, `DrinkCard` venue headline, `DrinkLogView`/`DrinksView`/`App.tsx` routes.

When in doubt about a tradeoff, the constitution wins.
<!-- SPECKIT END -->
