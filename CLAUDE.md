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

**Active feature**: `005-build-time-api-key` — optional built-in Anthropic key via
`VITE_ANTHROPIC_KEY` in an untracked `.env`; precedence personal → built-in → none;
BYOK Settings flow stays as fallback/override. NO AI call changes (G2 N/A);
no store/DB changes. Key-bearing builds are personal/private only — never set the
var in Vercel (threat model in plan.md).
- Spec: [specs/005-build-time-api-key/spec.md](specs/005-build-time-api-key/spec.md)
- Plan: [specs/005-build-time-api-key/plan.md](specs/005-build-time-api-key/plan.md)
- Research (Phase 0): [specs/005-build-time-api-key/research.md](specs/005-build-time-api-key/research.md)
- Data model: [specs/005-build-time-api-key/data-model.md](specs/005-build-time-api-key/data-model.md)
- Quickstart: [specs/005-build-time-api-key/quickstart.md](specs/005-build-time-api-key/quickstart.md)
- Contracts: [specs/005-build-time-api-key/contracts/](specs/005-build-time-api-key/contracts/)

**005 key touchpoints** (per plan.md; enumerated as tasks by `/speckit-tasks`):
1. New `src/lib/apiKey.ts`: `getBuiltInApiKey()` (call-time env read, blank → null)
   + `resolveApiKey()` → `{ source: 'personal'|'built-in'|'none', key }`.
2. `src/ai/client.ts`: resolve via `resolveApiKey()`; `ClaudeNetworkError.keySource`.
3. `Settings.tsx` source indicator (never shows built-in value); `ScanView`/`CoffeeView`
   gate on resolution + 401-with-built-in actionable message.
4. Committed `.env.example` (placeholder + Vercel warning); `.env` already git-ignored.

When in doubt about a tradeoff, the constitution wins.
<!-- SPECKIT END -->
