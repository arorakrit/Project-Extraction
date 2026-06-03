<!-- SPECKIT START -->
**Project**: Project Extraction — a mobile-first specialty coffee discovery and
brew-logging app. React + TypeScript + Vite SPA. Claude `claude-sonnet-4-6` for
vision extraction and enrichment. IndexedDB for local-first persistence. BYOK
Anthropic key (no bundled secrets).

**Constitution**: [.specify/memory/constitution.md](.specify/memory/constitution.md) — v1.0.0,
ratified 2026-05-29. Five principles; II (AI Schema-First) and I (Spec-Driven)
are NON-NEGOTIABLE.

**Shipped**: `001-scan-bag-to-card` — photograph a bag → coffee card (merged to
`main`). Established the `src/` layout: `ai/` (tool-use + Zod schemas, telemetry,
retry), `store/` (IndexedDB via `idb`: `coffees` + `settings`), mobile-first
`components/` + `views/`, BYOK key in Settings. `002-voice-brew-logging` — speak a
brew note → structured brew log; added the `brews` store (`DB_VERSION` 2,
`by_coffee` index) and the `structure_brew_note` Claude call.

**Active feature**: `003-log-a-drink` — fast, fully manual drink logging at
cafés/events → standalone tasting journal. NO AI call (G2/G5 N/A).
- Spec: [specs/003-log-a-drink/spec.md](specs/003-log-a-drink/spec.md)
- Plan: [specs/003-log-a-drink/plan.md](specs/003-log-a-drink/plan.md)
- Research (Phase 0): [specs/003-log-a-drink/research.md](specs/003-log-a-drink/research.md)
- Data model: [specs/003-log-a-drink/data-model.md](specs/003-log-a-drink/data-model.md)
- Quickstart: [specs/003-log-a-drink/quickstart.md](specs/003-log-a-drink/quickstart.md)
- Contracts: [specs/003-log-a-drink/contracts/](specs/003-log-a-drink/contracts/)

**003 key touchpoints** (per plan.md; enumerated as tasks by `/speckit-tasks`):
1. IndexedDB `DB_VERSION` 2 → 3: new standalone `drinks` store (no FK, no index; forward-only).
2. New `src/store/drinks.ts` (`makeDrinkLog` factory + CRUD + `listVenues`) and
   `src/lib/flavours.ts` (fixed 6-tag palette, max 3). No Zod (no AI output).
3. Mobile-first UI: `#/log` form (star rating required, venue type-ahead, flavour
   picker) + `#/drinks` history tab + home entry point + persistent FAB.
4. Rating is the only required field; everything works offline with no account.

When in doubt about a tradeoff, the constitution wins.
<!-- SPECKIT END -->
