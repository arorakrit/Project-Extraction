# Research: Build-Time API Key with BYOK Fallback

**Feature**: `005-build-time-api-key` | **Date**: 2026-06-12 | **Phase**: 0

The Technical Context had no `NEEDS CLARIFICATION` markers; this document records the
decisions behind each non-obvious technical choice.

## R1. Build-time key delivery mechanism

- **Decision**: Vite env variable `VITE_ANTHROPIC_KEY`, supplied through an untracked
  `.env` file at the repo root, read via `import.meta.env.VITE_ANTHROPIC_KEY`.
- **Rationale**: Vite statically replaces `import.meta.env.VITE_*` at build time — no new
  dependency, no runtime fetch, works identically in `vite dev` and `vite build`. The
  `.env` path is already covered by `.gitignore` (verified), satisfying FR-007 with zero
  ignore-rule changes. Decisive: an untracked `.env` containing exactly this variable name
  **already exists in the working tree** — the owner has pre-adopted this convention, so
  any other name/mechanism would orphan it.
- **Alternatives considered**:
  - `define` in `vite.config.ts` reading `process.env` — equivalent result, but invents a
    bespoke channel when Vite's `.env` convention is standard and self-documenting.
  - Runtime `config.json` fetched at startup — keeps the key out of the JS bundle but not
    out of the deployment (same exposure), adds a network read to app boot (Principle IV
    friction), and complicates the static Vercel deploy. Rejected.
  - Hardcoded key in source — violates the constitution's Secrets constraint; rejected
    during `/speckit-specify` (see spec Constitution Note).

## R2. Key precedence

- **Decision**: `personal (IndexedDB) → built-in (build env) → none`, resolved per call.
- **Rationale**: Fixed by the spec (FR-003, Key source entity). Personal-first keeps
  billing control with the user and means existing BYOK users see zero behaviour change
  (SC-004) without any migration.
- **Alternatives considered**: Built-in-first (rejected — silently absorbs other users'
  spend onto the owner's key and makes a saved personal key inert); user-selectable
  toggle (rejected — settings surface for a problem nobody has; YAGNI).

## R3. Surfacing "built-in key was rejected" (FR-008)

- **Decision**: `resolveApiKey()` returns `{ key, source }`. `callClaudeTool` passes the
  resolved `source` into `ClaudeNetworkError` (new readonly `keySource` field). Views map
  `status === 401 && keySource === 'built-in'` to the actionable message ("This build's
  built-in key was rejected — add your own key in Settings."); all other error paths
  are unchanged.
- **Rationale**: The error must *name the failing credential* (FR-008, edge case "invalid
  personal key still wins"). Attaching the source to the existing error class is the
  smallest change that lets the existing per-view error rendering stay in place; no new
  error class proliferation.
- **Alternatives considered**: A dedicated `BuiltInKeyRejectedError` thrown from the
  client (rejected — duplicates `ClaudeNetworkError`'s status/telemetry handling and
  would need catching in three views); inspecting the message string in views (rejected —
  brittle).

## R4. Threat model for key-bearing builds

- **Decision**: Documented in plan.md (Threat Model section). Headline: a `VITE_*` value
  is **public by construction** — it ships in the bundle. Key-bearing builds are
  personal/private only; the public Vercel deployment must NOT set `VITE_ANTHROPIC_KEY`.
- **Rationale**: The constitution's deferred TODO(API_KEY_HANDLING) requires the threat
  model recorded in plan.md. The repo deploys publicly via Vercel (`vercel.json`), so the
  most likely real-world failure is someone setting the env var in the Vercel dashboard —
  hence the explicit warning in `.env.example` and quickstart.md rather than only in spec
  prose.
- **Alternatives considered**: Minimal key proxy (serverless function holding the key) —
  the only design where the key never reaches clients; offered to and declined by the
  owner during `/speckit-specify` in favour of build-time embedding with accepted risk.
  Remains the documented upgrade path if the app ever gets a public key-bearing deploy.

## R5. Testing `import.meta.env` reads

- **Decision**: `src/lib/apiKey.ts` reads `import.meta.env.VITE_ANTHROPIC_KEY` *inside*
  `getBuiltInApiKey()` (call-time), never as a module-scope constant. Tests use Vitest's
  `vi.stubEnv('VITE_ANTHROPIC_KEY', …)` / `vi.unstubAllEnvs()`.
- **Rationale**: `vi.stubEnv` mutates `import.meta.env` after module load; a module-scope
  constant would freeze the value at import time and make precedence tests
  order-dependent. Call-time reads cost nothing (static replacement makes it a property
  access) and keep the module trivially testable alongside the existing fake-indexeddb
  harness for the personal-key path.
- **Alternatives considered**: Dependency-injecting the env into `resolveApiKey()`
  (rejected — pushes test plumbing into production call sites); `vi.mock` on the module
  (rejected — then the module under test is the thing mocked).

## R6. Blank/whitespace built-in key (FR-009)

- **Decision**: `getBuiltInApiKey()` trims the env value and returns `null` for
  empty/whitespace-only strings — indistinguishable from the var being unset.
- **Rationale**: `VITE_ANTHROPIC_KEY=` left in a `.env` (common after deleting a key)
  must degrade to the no-key path, not produce a guaranteed-401 "invalid key" experience.
  Spec edge case, directly testable.
- **Alternatives considered**: Treating blank as invalid-key (rejected by spec).
