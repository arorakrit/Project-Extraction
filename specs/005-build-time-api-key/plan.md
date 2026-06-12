# Implementation Plan: Build-Time API Key with BYOK Fallback

**Branch**: `005-build-time-api-key` | **Date**: 2026-06-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-build-time-api-key/spec.md`

## Summary

Let a build carry a built-in Anthropic API key supplied at build time through Vite's env
mechanism (`VITE_ANTHROPIC_KEY` in an untracked `.env`), so AI features work with zero key
setup on personal builds. Key resolution follows a fixed precedence — **personal (IndexedDB)
→ built-in (build env) → none** — implemented in one new module (`src/lib/apiKey.ts`) that
`client.ts` and the key-gating views consume. Settings shows which source is active without
revealing the built-in value. Builds without the env var behave exactly as today (BYOK-only).
No AI schema, prompt, store, or DB-version changes.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict), React 18.3

**Primary Dependencies**: Vite 6 (`import.meta.env` static replacement — already the build
tool; no new dependencies), idb 8 (existing `settings` store, unchanged)

**Storage**: IndexedDB `settings` store via `src/store/settings.ts` — **unchanged**; the
built-in key is never persisted to the store, it lives only in the bundle. `DB_VERSION`
stays at 3.

**Testing**: Vitest 2 + Testing Library + fake-indexeddb (existing harness). Env stubbing
via `vi.stubEnv('VITE_ANTHROPIC_KEY', …)` — requires the module to read `import.meta.env`
at call time, not at module top level (see research.md R5).

**Target Platform**: Mobile-first browser SPA (≤ 430px first), deployed as static Vite build

**Project Type**: Web SPA (single project, existing `src/` layout)

**Performance Goals**: None new — key resolution adds zero network calls and reuses the one
IndexedDB read that already happens per AI call.

**Constraints**: No key material in any committed file (constitution Secrets constraint);
key-bearing builds are for personal/private deployment only (accepted risk recorded in
spec); existing tests must stay green.

**Scale/Scope**: ~5 source files touched, 1 new module, 1 new committed example file
(`.env.example`), 2 test files (1 new, 1 updated). No new routes, views, or stores.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **G1. Spec lineage (Principle I)** — **PASS.** Plan references
  [specs/005-build-time-api-key/spec.md](spec.md) authored via `/speckit-specify`.
  `/speckit-clarify` was not run as a separate step: the single material ambiguity
  (hardcode vs. compliant alternative) was resolved interactively with the project owner
  during `/speckit-specify` and is recorded in the spec's Constitution Note; the spec
  shipped with zero `[NEEDS CLARIFICATION]` markers.
- **G2. AI schema-first (Principle II)** — **N/A.** No Claude call is added or modified;
  no prompt or schema text changes. Only the credential attached to the existing
  `callClaudeTool` request changes. No golden-fixture update required (fixture rule
  triggers on prompt/schema change only).
- **G3. Mobile-first UX (Principle III)** — **PASS.** The only UI change is a static
  status line + adjusted helper copy inside the existing Settings view (already ≤ 430px,
  thumb-reachable). No new interactive elements, so no new touch-target obligations;
  existing 44×44 targets untouched.
- **G4. Local-first persistence (Principle IV)** — **PASS.** Personal key stays in the
  IndexedDB `settings` store as today. The built-in key is read from the bundle
  (network-independent by definition). No store schema or migration changes; read paths
  for coffees/brews/drinks untouched.
- **G5. Observability & cost (Principle V)** — **PASS.** Zero new Claude calls
  (calls-per-user-action unchanged). Telemetry fields unchanged. The existing
  user-actionable-error rule is *extended*: a provider rejection of the built-in key gets
  its own actionable message (FR-008) instead of the generic network error.
- **G6. Technology constraints** — **PASS.** Stack unchanged (React + TS + Vite +
  IndexedDB + same model id). Secrets constraint honoured: the key arrives via untracked
  `.env` (already covered by `.gitignore`); the only committed artifact is `.env.example`
  with a placeholder. This plan *resolves the deferred TODO(API_KEY_HANDLING) decision
  for key-bearing builds* — browser-direct with a build-time key — and records the threat
  model below, as the constitution requires.

**Post-Phase-1 re-check (2026-06-12)**: All gates unchanged — design introduced no new
Claude calls, UI surfaces, or storage. PASS.

## Threat Model (Secrets — required by constitution TODO(API_KEY_HANDLING))

| Threat | Exposure | Mitigation |
|--------|----------|------------|
| Key committed to the public repo | Key auto-revoked by Anthropic scanning; total loss | `.env` already git-ignored and untracked (verified); only `.env.example` (placeholder) is committed; SC-003 mandates a repo scan before merge |
| Key extracted from a key-bearing bundle | Anyone who can load the build can lift the key and spend against it | **Accepted risk** (spec Constitution Note, owner-approved 2026-06-12). Key-bearing builds are personal/private only; recommend a spend limit + dedicated key that can be revoked independently |
| **Vercel deployment leaks the key** | The repo deploys publicly via Vercel (`vercel.json`). Setting `VITE_ANTHROPIC_KEY` in Vercel's env would bake the key into the *public* bundle | quickstart.md and `.env.example` carry an explicit warning: do **not** set this var in Vercel/CI for the public deployment — the public site stays BYOK-only |
| Built-in key visible in Settings UI | Shoulder-surfing / screenshots | FR-005: Settings shows only the *source* ("built-in key active"), never the value, in full or part |

## Project Structure

### Documentation (this feature)

```text
specs/005-build-time-api-key/
├── spec.md              # Feature specification (/speckit-specify)
├── plan.md              # This file (/speckit-plan)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── key-resolution.md  # Module + env contract (Phase 1)
├── checklists/
│   └── requirements.md  # Spec quality checklist (passed 2026-06-12)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.env.example                      # NEW — committed; placeholder only + Vercel warning
.gitignore                        # unchanged — already ignores .env (verified)

src/
├── lib/
│   └── apiKey.ts                 # NEW — getBuiltInApiKey(), resolveApiKey(); the only
│                                 #       reader of import.meta.env.VITE_ANTHROPIC_KEY
├── ai/
│   └── client.ts                 # MODIFIED — callClaudeTool uses resolveApiKey();
│                                 #            ClaudeNetworkError gains keySource so views
│                                 #            can name the failing credential (FR-008)
├── store/
│   └── settings.ts               # unchanged — personal key CRUD stays as-is
├── components/
│   └── Settings.tsx              # MODIFIED — active-source status line; copy reflects
│                                 #            built-in fallback when present (FR-005)
└── views/
    ├── ScanView.tsx              # MODIFIED — gate on resolveApiKey(); built-in-rejected
    │                             #            message path (FR-008)
    └── CoffeeView.tsx            # MODIFIED — same gating change as ScanView

tests/
└── unit/
    ├── lib/
    │   └── apiKey.test.ts        # NEW — precedence, blank-is-absent, none case
    └── components/
        └── settings.test.tsx     # UPDATED — source-indicator states (existing file dir)
```

**Structure Decision**: Single-project SPA layout, exactly as established by features
001–004. The resolution logic is a new `src/lib/` module (pattern: `retry.ts`,
`telemetry.ts` — small framework-free utilities) rather than an extension of
`src/store/settings.ts`, because the built-in key is *not stored* — mixing bundle-env
reads into the IndexedDB store module would blur Principle IV's "local store is the
writer of record" boundary. `client.ts` keeps a single key entry point, as today.

## Complexity Tracking

No constitution violations to justify — table intentionally empty.
