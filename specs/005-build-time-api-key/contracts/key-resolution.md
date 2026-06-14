# Contract: Key Resolution Module & Build Env

**Feature**: `005-build-time-api-key` | **Date**: 2026-06-12 | **Phase**: 1

Two contracts: the build-time environment contract (what a build consumes) and the
module contract (what the rest of the app consumes). `src/lib/apiKey.ts` is the **only**
module allowed to read the env var; everything else goes through `resolveApiKey()`.

## 1. Build environment contract

| Item | Value |
|------|-------|
| Variable | `VITE_ANTHROPIC_KEY` |
| Source | Untracked `.env` at repo root (already git-ignored), or shell env at build time |
| Format | Anthropic API key string (`sk-ant-…`); surrounding whitespace tolerated (trimmed) |
| Absent / empty / whitespace | Build behaves as BYOK-only (identical to pre-005 app) |
| Committed artifact | `.env.example` only — placeholder value, never a real key, plus the warning below |

> **WARNING (must appear in `.env.example` and quickstart):** any value in this variable
> ships inside the public JS bundle of the build. Never set it in Vercel/CI for the
> public deployment. Personal/private builds only. Prefer a dedicated, spend-limited key.

## 2. Module contract — `src/lib/apiKey.ts`

```ts
export type KeySource = 'personal' | 'built-in' | 'none'

export interface KeyResolution {
  source: KeySource
  key: string | null        // null ⇔ source === 'none'; otherwise trimmed, non-empty
}

/** Trimmed VITE_ANTHROPIC_KEY, or null when unset/blank. Reads env at call time. */
export function getBuiltInApiKey(): string | null

/** Fixed precedence: personal (settings store) → built-in (env) → none. */
export function resolveApiKey(): Promise<KeyResolution>
```

### Behaviour table (normative — mirrors data-model.md)

| `getApiKey()` (settings) | `VITE_ANTHROPIC_KEY` trimmed | `resolveApiKey()` returns |
|---|---|---|
| `"sk-ant-p…"` | `"sk-ant-b…"` | `{ source: 'personal', key: 'sk-ant-p…' }` |
| `"sk-ant-p…"` | unset/blank | `{ source: 'personal', key: 'sk-ant-p…' }` |
| `null` | `"sk-ant-b…"` | `{ source: 'built-in', key: 'sk-ant-b…' }` |
| `null` | unset | `{ source: 'none', key: null }` |
| `null` | `""` or `"   "` | `{ source: 'none', key: null }` |

## 3. Consumer contracts

### `src/ai/client.ts`

- `callClaudeTool` calls `resolveApiKey()` (replaces direct `getApiKey()`).
- `source === 'none'` → throw `MissingApiKeyError` (message unchanged).
- HTTP error → `ClaudeNetworkError` now carries `keySource: KeySource` (the source used
  for that request). No other telemetry/retry behaviour changes.

### Views (`ScanView`, `CoffeeView`)

- Pre-flight gating switches from `getApiKey()` truthiness to
  `(await resolveApiKey()).source !== 'none'`.
- Error rendering adds one mapping: `ClaudeNetworkError` with `status === 401` and
  `keySource === 'built-in'` → "This build's built-in key was rejected — add your own
  key in Settings." All other failures render exactly as today (401 with
  `keySource === 'personal'` keeps the existing message, which correctly points at the
  user's own key).

### `src/components/Settings.tsx`

- Computes `resolveApiKey()` on mount (and after save/clear) and renders the active
  source (FR-005):
  - `personal` → existing "(saved — paste again to overwrite)" affordance, unchanged.
  - `built-in` → status line: built-in key active; saving your own key overrides it.
  - `none` → today's copy, verbatim (FR-006 / US3).
- MUST NOT render any part of the built-in key value.
- Clear button: visible only when a *personal* key is saved (clearing reverts to
  built-in or none per FR-004); it never offers to clear the built-in key.

## 4. Contract tests (→ tasks phase)

- `tests/unit/lib/apiKey.test.ts`: all five behaviour-table rows, using
  `vi.stubEnv` + fake-indexeddb.
- `tests/unit/components/settings.test.tsx`: three source states render correctly; the
  built-in key value never appears in the DOM.
