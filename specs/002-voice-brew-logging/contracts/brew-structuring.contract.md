# Contract: `structure_brew_note`

**Feature**: 002-voice-brew-logging
**Owner module**: `src/ai/client.ts`
**Schema source of truth**: `src/ai/schemas/brew.ts` (Zod)
**Prompt source of truth**: `src/ai/prompts/brew.ts`
**Constitutional principle**: II — AI Schema-First Contracts (NON-NEGOTIABLE)

---

## Purpose

Take the raw transcript of a spoken brew note and return a structured set of brew
parameters the model could identify, leaving anything not stated as `null`. Drives
User Story 1 in the spec.

---

## Consumer signature

```ts
// src/ai/client.ts
export async function structureBrewNote(
  transcript: string,  // raw recognized speech, e.g. "V60, eighteen in, three hundred out, ..."
): Promise<StructuredBrew>
```

Throws:
- `MissingApiKeyError` — no BYOK key configured (UX should route to Settings first).
- `ClaudeNetworkError` — non-2xx response from Anthropic.
- `ClaudeSchemaError` — tool_use input failed Zod validation twice in a row.
- `BrewEmptyError` — schema valid but every field is `null` (FR-008 total-miss).
  Caller catches it, shows "didn't catch that", and keeps the transcript
  recoverable into the manual form.

> Note: unlike `extractCoffeeLabel`, there is no image; `inputImageBytes` is
> `null` and `input_text_chars` carries the transcript length for telemetry.

---

## Provider

- **Model**: `claude-sonnet-4-6` (exact id; substitution requires a constitution
  MINOR amendment).
- **Endpoint**: `POST https://api.anthropic.com/v1/messages`
- **Headers**: `anthropic-version: 2023-06-01`,
  `anthropic-dangerous-direct-browser-access: true`,
  `x-api-key: <BYOK from settings store>`, `content-type: application/json`.
- **Body** (illustrative shape):

```jsonc
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "tool_choice": { "type": "tool", "name": "record_brew_log" },
  "tools": [{
    "name": "record_brew_log",
    "description": "Record the brew parameters the user stated in their note. Set a field to null if they did not state it. Convert times to whole seconds and use grams for dose/water and Celsius for temperature.",
    "input_schema": { /* JSON Schema derived from StructuredBrewSchema */ }
  }],
  "messages": [{
    "role": "user",
    "content": [{
      "type": "text",
      "text": "Here is a spoken brew note. Call record_brew_log with what the user actually said. Do not invent values they did not mention.\n\nNOTE: \"<transcript>\""
    }]
  }]
}
```

---

## Tool definition (JSON Schema)

Derived at module load from `StructuredBrewSchema` (Zod) via `zod-to-json-schema`.
**Never hand-written** — the Zod object is the single source of truth (Principle
II).

```jsonc
{
  "type": "object",
  "properties": {
    "brew_method":  { "type": ["string", "null"] },
    "dose_g":       { "type": ["number", "null"] },
    "water_g":      { "type": ["number", "null"] },
    "ratio":        { "type": ["number", "null"] },
    "grind":        { "type": ["string", "null"] },
    "water_temp_c": { "type": ["number", "null"] },
    "total_time_s": { "type": ["integer", "null"] },
    "tasting_note": { "type": ["string", "null"] }
  },
  "required": [
    "brew_method", "dose_g", "water_g", "ratio",
    "grind", "water_temp_c", "total_time_s", "tasting_note"
  ],
  "additionalProperties": false
}
```

`tests/unit/ai/brew-schema.test.ts` verifies the generated JSON Schema accepts
everything Zod accepts and rejects what Zod rejects across the fixture set.

---

## Input preconditions

- `transcript` is a non-empty string produced by `src/lib/speech.ts`. An empty or
  whitespace-only transcript is short-circuited by the caller into the
  "didn't catch that" UX without a Claude call.
- A BYOK Anthropic key is present in the settings store. The UX routes to Settings
  before invoking; the function throws `MissingApiKeyError` defensively.

---

## Output postconditions

- On success: `StructuredBrewSchema.parse(toolUse.input)` succeeds and at least
  one field is non-null.
- On total-miss: every field is `null` → `BrewEmptyError` is thrown. The recorder
  surfaces "Didn't catch that — try again, or enter by hand" (FR-008) and the raw
  transcript remains available to pre-fill the manual form.

---

## Retry strategy (Principle V)

- HTTP errors (5xx, network/offline): **no retry** — caller falls back to the
  manual form pre-filled with the transcript (no data loss).
- Schema-validation failure of the tool_use input: **exactly 1 retry** with the
  same prompt after a 500 ms delay (reuses `callClaudeTool`'s `retryOnce`). If the
  second attempt also fails to validate, throw `ClaudeSchemaError`.

---

## Telemetry contract (Principle V)

Every call emits a `TelemetryRecord` to `lib/telemetry.ts`:

| Field               | Source                                       |
|---------------------|----------------------------------------------|
| `call`              | Literal `'structure_brew_note'`              |
| `model_id`          | Literal `'claude-sonnet-4-6'`                |
| `status`            | `'ok' \| 'retry_then_ok' \| 'schema_error' \| 'network_error'` |
| `latency_ms`        | Wall-clock around the `fetch()` call         |
| `input_image_bytes` | `null` (text-only call)                      |
| `input_text_chars`  | `transcript.length` (NEW field)              |
| `output_tokens`     | `response.usage.output_tokens`               |
| `retried`           | `true` iff a retry was attempted             |
| `ts`                | ISO 8601 at call start                       |

**Forbidden in telemetry**: the raw transcript text, any audio, the API key. Only
the character count is recorded.

---

## Cost expectation

- Input: ~0.3–0.6K tokens (short transcript + prompt + tool schema).
- Output: ~80–150 tokens (small structured tool_use response).
- Approximate cost per call: **~$0.002**.

**One call per brew log** (structuring only) → well under the ≥ 3-call Principle V
threshold. Aggregated per-session spend is surfaced via the existing dev HUD.

---

## Golden fixtures

Stored at `tests/ai-fixtures/brew-structuring/`. Each fixture is a triplet:

```text
tests/ai-fixtures/brew-structuring/
└── v60-ethiopia/
    ├── input.transcript.json   # the raw spoken text (no audio bytes)
    ├── recorded-response.json  # the full Claude response that was captured
    └── expected-output.json    # the post-validation StructuredBrew
```

The fixture test loads `recorded-response.json`, runs it through
`StructuredBrewSchema.parse(...)`, and asserts equality with
`expected-output.json`. **No live Claude call is made during testing.** At least
one new fixture MUST land with any prompt or schema change (constitution Workflow
rule).

---

## Failure-mode UX contract (FR-005, FR-008, FR-017)

| Outcome                        | What the user sees |
|--------------------------------|--------------------|
| Some/all fields populated      | Review entry with populated rows; empty params marked "—" and tappable. |
| Every field `null`             | "Didn't catch that — try again, or enter by hand"; transcript recoverable. |
| `ClaudeNetworkError` / offline | Manual form pre-filled with the raw transcript as the tasting note. |
| `ClaudeSchemaError`            | Same as network: manual form pre-filled with the transcript. |
| Speech recognition unavailable | Manual form shown directly (no Claude call). |
| `MissingApiKeyError`           | Redirect to Settings; user enters key; the log action is preserved. |
