# Contract: `structure_drink_note` (Claude tool-use call)

**Feature**: `006-cafe-voice-drink-logging` | **Status**: Draft | **Date**: 2026-06-12

The single new AI call. Converts one spoken drink description (already
transcribed in-browser) into a typed `VoiceDrinkDraft`. Constitution
Principle II applies in full: schema-first, validate-before-render, no
fabrication.

## Invocation

| Property | Value |
|---|---|
| Wrapper | `callClaudeTool` (`src/ai/client.ts`) — mandatory; brings retry, telemetry, key resolution |
| Telemetry `call` | `'structure_drink_note'` |
| Tool name | `record_drink_log` |
| `tool_choice` | `{ type: 'tool', name: 'record_drink_log' }` (forced) |
| Model | `claude-sonnet-4-6` (constitutional) |
| `max_tokens` | 1024 (wrapper default) |
| Input | one `user` message, single text block: `buildDrinkPrompt(transcript)` |
| `input_schema` | derived at module load from `VoiceDrinkDraftSchema` via `zod-to-json-schema` — never hand-written |
| Calls per user action | exactly 1 |

## Output schema (single source of truth: `src/ai/schemas/drink.ts`)

```ts
export const VoiceDrinkDraftSchema = z.object({
  venue: z.string().nullable(),
  coffee_name: z.string().nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  flavour_tags: z.array(z.enum(FLAVOUR_TAGS)), // 'fruity'|'floral'|'chocolatey'|'nutty'|'bright'|'heavy'
})
export type VoiceDrinkDraft = z.infer<typeof VoiceDrinkDraftSchema>
```

## Prompt obligations (`src/ai/prompts/drink.ts`)

The tool description + user prompt MUST instruct the model to:

1. Extract **only what was explicitly said** — unmentioned fields are `null`
   (`flavour_tags: []`), never guessed.
2. `venue`: the place name as spoken ("at Sunday's Coffee" → "Sunday's
   Coffee"); strip leading "at/in".
3. `coffee_name`: the drink/coffee as spoken ("oat flat white", "the Kenyan
   filter"). Not the venue.
4. `rating`: only an explicit numeric/star value ("four stars", "4 out of 5").
   Vague sentiment ("really good") → `null`. Half values round down ("four and
   a half" → 4) — stated in the prompt so behaviour is fixture-testable.
5. `flavour_tags`: only palette words or unambiguous synonyms the prompt
   enumerates; anything else (e.g. "jammy") is **omitted**, never mapped to a
   near-miss. Order = order of mention.

## Post-validation pipeline (client-side, deterministic)

```text
tool_use.input
  → VoiceDrinkDraftSchema.safeParse        (fail → retryOnce → ClaudeSchemaError)
  → normalizeDrinkDraft(draft)             (dedupe tags, cap at first 3 — removal only)
  → isEmptyDrinkDraft(draft)?              (all null/empty → throw DrinkDraftEmptyError)
  → resolveVenueCasing(draft.venue)        (existing café casing adopted; FR-015)
  → prefill café-first form for review     (FR-012 — never auto-saved)
```

## Error contract

| Condition | Throws | UX obligation |
|---|---|---|
| No API key resolvable | `MissingApiKeyError` | existing Settings-pointing message |
| Non-2xx HTTP / offline | `ClaudeNetworkError` (carries `keySource`) | retryable error; **transcript stays visible**; manual form one tap away |
| Schema-invalid twice | `ClaudeSchemaError` | same retryable error state as network failure |
| Schema-valid but empty | `DrinkDraftEmptyError` | "Didn't catch that — try again, or log it by hand." (FR-016) |

In every error case: **nothing is persisted** and the raw transcript is not
lost while the error state is on screen (Principle IV).

## Telemetry contract (Principle V)

One `TelemetryRecord` per attempt: `call: 'structure_drink_note'`, `model_id`,
`status` (`ok` / `retry_then_ok` / `schema_error` / `network_error`),
`latency_ms`, `input_image_bytes: null`, `input_text_chars: transcript.length`,
`output_tokens`, `retried`, `ts`. Raw transcript/audio MUST NOT be logged.

## Golden fixture (Principle II gate)

At least one fixture under `tests/ai-fixtures/drink-structuring/`:

```text
flat-white-four-stars/
├── input.transcript.json     # e.g. "oat flat white at Sunday's Coffee, four stars, fruity and bright"
├── recorded-response.json    # captured tool_use response from a real call
└── expected-output.json      # post-validation + normalization VoiceDrinkDraft
```

The fixture replays `recorded-response.json` through
`VoiceDrinkDraftSchema` + `normalizeDrinkDraft` and asserts deep equality with
`expected-output.json`. Any future prompt or schema change MUST update or add a
fixture (constitution quality gate).
