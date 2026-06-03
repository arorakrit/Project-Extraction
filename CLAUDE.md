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
`by_coffee` index) and the `structure_brew_note` Claude call. `003-log-a-drink` —
fast manual drink logging → standalone `drinks` store (`DB_VERSION` 3) + `#/log`
form and `#/drinks` history (PR #5).

**Active feature**: `004-cupd-brand-refactor` — re-skin the whole app to the
**Cup'd** identity from `cupd-brand-board.html`. Presentation-only; NO AI call
(G2/G5 N/A).
- Spec: [specs/004-cupd-brand-refactor/spec.md](specs/004-cupd-brand-refactor/spec.md)
- Plan: [specs/004-cupd-brand-refactor/plan.md](specs/004-cupd-brand-refactor/plan.md)
- Research (Phase 0): [specs/004-cupd-brand-refactor/research.md](specs/004-cupd-brand-refactor/research.md)
- Data model: [specs/004-cupd-brand-refactor/data-model.md](specs/004-cupd-brand-refactor/data-model.md)
- Quickstart: [specs/004-cupd-brand-refactor/quickstart.md](specs/004-cupd-brand-refactor/quickstart.md)
- Contracts: [specs/004-cupd-brand-refactor/contracts/](specs/004-cupd-brand-refactor/contracts/)

**004 key touchpoints** (per plan.md; enumerated as tasks by `/speckit-tasks`):
1. Token-first: redefine `style.css` `:root` to "Cupping Room After Dark" (Ink/Slate/
   Bone/Jade); add `--font-display/-body/-mono`; retire the light theme (dark-only).
2. Bundle 3 brand faces offline via `@fontsource-variable/*` (no Google CDN — Principle IV).
3. Targeted component edits: type roles, the jade-edge slate card anatomy, mono data,
   the Cup'd wordmark, and second-person voice copy. No component hardcodes colours/fonts.
4. Preserve all behaviour (existing tests stay green), 44×44 targets, ≤430px, WCAG AA.

When in doubt about a tradeoff, the constitution wins.
<!-- SPECKIT END -->
