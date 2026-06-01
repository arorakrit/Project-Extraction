<!-- SPECKIT START -->
**Project**: Project Extraction — a mobile-first specialty coffee discovery and
brew-logging app. React + TypeScript + Vite SPA. Claude `claude-sonnet-4-6` for
vision extraction and enrichment. IndexedDB for local-first persistence. BYOK
Anthropic key (no bundled secrets).

**Constitution**: [.specify/memory/constitution.md](.specify/memory/constitution.md) — v1.0.0,
ratified 2026-05-29. Five principles; II (AI Schema-First) and I (Spec-Driven)
are NON-NEGOTIABLE.

**Active feature**: `001-scan-bag-to-card` — photograph a bag → coffee card.
- Spec: [specs/001-scan-bag-to-card/spec.md](specs/001-scan-bag-to-card/spec.md)
- Plan: [specs/001-scan-bag-to-card/plan.md](specs/001-scan-bag-to-card/plan.md)
- Research (Phase 0): [specs/001-scan-bag-to-card/research.md](specs/001-scan-bag-to-card/research.md)
- Data model: [specs/001-scan-bag-to-card/data-model.md](specs/001-scan-bag-to-card/data-model.md)
- Quickstart: [specs/001-scan-bag-to-card/quickstart.md](specs/001-scan-bag-to-card/quickstart.md)
- Contracts: [specs/001-scan-bag-to-card/contracts/](specs/001-scan-bag-to-card/contracts/)

**Open scaffolding migrations** (called out by plan.md Constitution Check;
will be enumerated as tasks by `/speckit-tasks`):
1. `lib/claude.js` model id `claude-sonnet-4-20250514` → `claude-sonnet-4-6`.
2. Replace bundled `VITE_ANTHROPIC_KEY` with BYOK in Settings + IndexedDB.
3. Replace prompt-engineered JSON parsing with tool use + Zod validation.
4. Replace `localStorage` (App.jsx) with IndexedDB via `idb`.
5. Migrate all `.jsx`/`.js` to `.tsx`/`.ts` under `src/`.

When in doubt about a tradeoff, the constitution wins.
<!-- SPECKIT END -->
