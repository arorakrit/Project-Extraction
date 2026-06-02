# Contract: `extract_coffee_label`

**Feature**: 001-scan-bag-to-card
**Owner module**: `src/ai/client.ts`
**Schema source of truth**: `src/ai/schemas/extraction.ts` (Zod)
**Prompt source of truth**: `src/ai/prompts/extraction.ts`
**Constitutional principle**: II — AI Schema-First Contracts (NON-NEGOTIABLE)

---

## Purpose

Take a single photo of a coffee bag and return a structured set of label
fields that the model could read with confidence. Drives User Story 1 in
the spec.

---

## Consumer signature

```ts
// src/ai/client.ts
export async function extractCoffeeLabel(
  imageDataUrl: string,  // "data:image/jpeg;base64,..."
): Promise<ExtractedCoffee>
```

Throws:
- `ClaudeNetworkError` — non-2xx response from Anthropic.
- `ClaudeSchemaError` — tool_use input failed Zod validation twice in a row.
- `ExtractionEmptyError` — schema valid but every scalar field is `null` and
  `tasting_notes` is empty (FR-007 — total-failure case).

---

## Provider

- **Model**: `claude-sonnet-4-6` (exact id; substitution requires constitution
  MINOR amendment).
- **Endpoint**: `POST https://api.anthropic.com/v1/messages`
- **Headers**:
  - `anthropic-version: 2023-06-01`
  - `anthropic-dangerous-direct-browser-access: true`
  - `x-api-key: <BYOK from settings store>`
  - `content-type: application/json`
- **Body** (illustrative shape):

```jsonc
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "tool_choice": { "type": "tool", "name": "record_coffee_label" },
  "tools": [{
    "name": "record_coffee_label",
    "description": "Record the fields you can read from the coffee bag label. Set a field to null if you cannot read it confidently. Tasting notes is an array (possibly empty).",
    "input_schema": { /* JSON Schema derived from ExtractedCoffeeSchema */ }
  }],
  "messages": [{
    "role": "user",
    "content": [
      {
        "type": "image",
        "source": { "type": "base64", "media_type": "image/jpeg", "data": "<base64>" }
      },
      {
        "type": "text",
        "text": "Read this specialty coffee bag label and call the record_coffee_label tool with what you can see. Do not infer or guess fields that are not visible on the bag."
      }
    ]
  }]
}
```

---

## Tool definition (JSON Schema)

Derived at module load from `ExtractedCoffeeSchema` (Zod) via
`zod-to-json-schema`. **Never hand-written.** The Zod object is the single
source of truth per constitution Principle II.

```jsonc
{
  "type": "object",
  "properties": {
    "roaster_name":    { "type": ["string", "null"] },
    "coffee_name":     { "type": ["string", "null"] },
    "origin_country":  { "type": ["string", "null"] },
    "origin_region":   { "type": ["string", "null"] },
    "variety":         { "type": ["string", "null"] },
    "process":         { "type": ["string", "null"] },
    "roast_level":     { "type": ["string", "null"] },
    "tasting_notes":   { "type": "array", "items": { "type": "string" } }
  },
  "required": [
    "roaster_name", "coffee_name", "origin_country", "origin_region",
    "variety", "process", "roast_level", "tasting_notes"
  ],
  "additionalProperties": false
}
```

Because the JSON Schema is generated from the Zod object, equivalence is
guaranteed by construction. The unit test
`tests/unit/ai/extraction-schema.test.ts` verifies that the generated JSON
Schema accepts everything Zod accepts (and rejects what Zod rejects) across
the golden fixture set — a regression net against future codegen changes.

---

## Input preconditions

- `imageDataUrl` starts with `data:image/` and contains base64 payload.
- Image has been resized to ≤ 1568 px on the long edge (handled by
  `src/lib/image.ts` upstream of this call — image not validated here).
- An Anthropic API key is present in the settings store. If absent, the
  caller MUST route the user to the Settings screen BEFORE invoking this
  function; `extractCoffeeLabel` throws `MissingApiKeyError` defensively
  but the UX should never let it fire.

---

## Output postconditions

On success: `ExtractedCoffeeSchema.parse(toolUse.input)` succeeds and at
least one scalar field is non-null OR `tasting_notes.length > 0`.

On total-failure path: `ExtractionEmptyError` is thrown. The Scanner view
catches it and routes to ErrorState (FR-007). The user sees "couldn't read
the label — try a clearer photo, or enter manually."

---

## Retry strategy (Principle V)

- HTTP errors (5xx, network failure): **no retry** — user sees a clear
  network message; they can retry by re-tapping capture.
- Schema-validation failure of the tool_use input: **exactly 1 retry** with
  the same prompt and image, after a 500 ms delay. If the second attempt
  also fails to validate, throw `ClaudeSchemaError` and log the offending
  payload (with image bytes redacted) to telemetry.

Rationale: image content is deterministic, so most retries don't help if
the model has issued a malformed tool_use — but model nondeterminism does
occasionally produce a one-off schema break, and a single retry catches
~95% of those without runaway cost.

---

## Telemetry contract (Principle V)

Every call emits a `TelemetryRecord` to `lib/telemetry.ts` containing:

| Field               | Source                                  |
|---------------------|-----------------------------------------|
| `call`              | Literal `'extract_coffee_label'`        |
| `model_id`          | Literal `'claude-sonnet-4-6'`           |
| `status`            | `'ok' | 'retry_then_ok' | 'schema_error' | 'network_error'` |
| `latency_ms`        | Wall-clock around the `fetch()` call    |
| `input_image_bytes` | `imageDataUrl` payload byte size        |
| `output_tokens`     | `response.usage.output_tokens`          |
| `retried`           | `true` iff a retry was attempted        |
| `ts`                | ISO 8601 at call start                  |

**Forbidden in telemetry**: raw image bytes, the model's text content, the
API key.

---

## Cost expectation

Per the Anthropic vision pricing for `claude-sonnet-4-6` (current pricing
as of constitution ratification):
- Input: ~1.5K tokens (one 1568 px JPEG + short prompt + tool schema).
- Output: ~150–250 tokens (small structured tool_use response).
- Approximate cost per call: **~$0.005**.

Two calls per "add a coffee" (extract + enrich) → ~$0.01 per coffee.
Aggregated per-session spend is surfaced via the dev HUD (Principle V).

---

## Golden fixtures

Stored at `tests/ai-fixtures/extraction/`. Each fixture is a triplet:

```text
tests/ai-fixtures/extraction/
└── ethiopia-yirgacheffe/
    ├── input.image-meta.json   # mime type, size, source description (not the image bytes themselves)
    ├── recorded-response.json  # the full Claude response that was captured
    └── expected-output.json    # the post-validation ExtractedCoffee
```

The fixture test (`tests/unit/ai/extraction-schema.test.ts`) loads
`recorded-response.json`, runs it through `ExtractedCoffeeSchema.parse(...)`,
and asserts equality with `expected-output.json`. **No live Claude call is
made during testing.** This is the regression net for prompt and schema
changes.

When a prompt or schema change makes a fixture fail, the engineer either:
- Updates `expected-output.json` (acknowledging the behavior change), AND
- Adds an entry to the plan's "Cost & call-count audit" PR description
  noting the impact.

At least one new fixture MUST land with any prompt or schema change
(constitution Workflow rule).

---

## Failure-mode UX contract (FR-005, FR-007)

| Outcome                       | What the user sees                                                                  |
|-------------------------------|-------------------------------------------------------------------------------------|
| All fields populated          | Card with all rows filled.                                                          |
| Some fields `null`            | Card with those rows visually marked empty ("—") and tappable to edit.              |
| All fields `null`, empty notes| ErrorState: "Couldn't read the label — try a clearer photo, or enter manually."    |
| `ClaudeNetworkError`          | Inline error with "Try again" + "Enter manually" buttons.                           |
| `ClaudeSchemaError`           | Same UX as network error; underlying cause logged for engineering follow-up.        |
| `MissingApiKeyError`          | Redirect to Settings; user enters key; original Scan action is preserved.           |
