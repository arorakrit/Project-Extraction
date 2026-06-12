# Data Model: Build-Time API Key with BYOK Fallback

**Feature**: `005-build-time-api-key` | **Date**: 2026-06-12 | **Phase**: 1

No persisted data changes. `DB_VERSION` stays at **3**; no migration. The feature adds
one in-memory resolution type.

## KeyResolution (in-memory only — never persisted)

```ts
// src/lib/apiKey.ts
export type KeySource = 'personal' | 'built-in' | 'none'

export interface KeyResolution {
  source: KeySource
  key: string | null   // non-null iff source !== 'none'
}
```

| Field | Type | Rules |
|-------|------|-------|
| `source` | `'personal' \| 'built-in' \| 'none'` | Exactly one; resolution order is fixed: personal → built-in → none (FR-003, FR-004) |
| `key` | `string \| null` | The credential to attach to the Claude call. `null` ⇔ `source === 'none'`. Trimmed; never empty string |

### Resolution rules (FR-002–FR-004, FR-009)

| Personal key saved? | `VITE_ANTHROPIC_KEY` (after trim) | Result |
|---|---|---|
| yes | (anything) | `{ source: 'personal', key: <personal> }` |
| no | non-empty | `{ source: 'built-in', key: <env value> }` |
| no | unset / empty / whitespace | `{ source: 'none', key: null }` |

- "Personal key saved" = existing `getApiKey()` from `src/store/settings.ts` returns a
  non-null value. An *invalid but saved* personal key still resolves as `personal`
  (spec edge case: no silent fallback that hides the user's mistake).

## Existing entities — explicitly unchanged

| Entity | Store | Change |
|--------|-------|--------|
| `SettingsRow { key, value }` (`anthropic_api_key` row) | `settings` (IndexedDB) | **None** — shape, key name, CRUD (`getApiKey`/`setApiKey`/`clearApiKey`) all unchanged |
| `coffees`, `brews`, `drinks` stores | IndexedDB | **None** |
| `TelemetryRecord` | in-memory session | **None** (no new fields; calls-per-action unchanged) |

## Modified error type

```ts
// src/ai/client.ts — existing class, one new readonly field
export class ClaudeNetworkError extends Error {
  public readonly status: number
  public readonly keySource: KeySource   // NEW — which credential was attached (FR-008)
}
```

`MissingApiKeyError` is thrown only when resolution yields `source === 'none'`; its
message ("Open Settings to add one") remains correct for that case.

## State transitions (key source, per device × build)

```text
                 save personal key                clear personal key
  built-in ────────────────────────▶ personal ────────────────────────▶ built-in   (env set)
  none     ────────────────────────▶ personal ────────────────────────▶ none       (env unset)
```

The built-in side of the state is fixed per build artifact (Assumption: no runtime
rotation); only the personal side transitions at runtime.
