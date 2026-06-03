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
`components/` + `views/`, BYOK key in Settings.

**Active feature**: `002-voice-brew-logging` — speak a brew note from a coffee
card → structured brew log entry; timeline on the coffee detail view.
- Spec: [specs/002-voice-brew-logging/spec.md](specs/002-voice-brew-logging/spec.md)
- Plan: [specs/002-voice-brew-logging/plan.md](specs/002-voice-brew-logging/plan.md)
- Research (Phase 0): [specs/002-voice-brew-logging/research.md](specs/002-voice-brew-logging/research.md)
- Data model: [specs/002-voice-brew-logging/data-model.md](specs/002-voice-brew-logging/data-model.md)
- Quickstart: [specs/002-voice-brew-logging/quickstart.md](specs/002-voice-brew-logging/quickstart.md)
- Contracts: [specs/002-voice-brew-logging/contracts/](specs/002-voice-brew-logging/contracts/)

**002 key touchpoints** (per plan.md; enumerated as tasks by `/speckit-tasks`):
1. IndexedDB `DB_VERSION` 1 → 2: new `brews` store + `by_coffee` index (forward-only).
2. New Claude call `structure_brew_note` (one per brew log) via existing `callClaudeTool`.
3. Voice via Web Speech API (`src/lib/speech.ts`), feature-detected; manual fallback.
4. `deleteCoffee` cascades to brews; telemetry gains `input_text_chars`.

When in doubt about a tradeoff, the constitution wins.
<!-- SPECKIT END -->
