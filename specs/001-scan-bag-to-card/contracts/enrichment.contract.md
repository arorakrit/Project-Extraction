# Contract: `enrich_coffee_profile`

**Feature**: 001-scan-bag-to-card
**Owner module**: `src/ai/client.ts`
**Schema source of truth**: `src/ai/schemas/enrichment.ts` (Zod)
**Prompt source of truth**: `src/ai/prompts/enrichment.ts`
**Constitutional principle**: II — AI Schema-First Contracts (NON-NEGOTIABLE)

---

## Purpose

After a coffee has been saved, attach additional context that goes beyond
what was printed on the label — origin story, producer/farm details, and a
suggested brew approach. Drives User Story 3 in the spec.

---

## Consumer signature

```ts
// src/ai/client.ts
export async function enrichCoffeeProfile(
  effective: ExtractedCoffee,   // post-merge view: user_edits ⊕ extracted
): Promise<EnrichedCoffee>
```

Throws:
- `ClaudeNetworkError` — non-2xx response.
- `ClaudeSchemaError` — tool_use input failed Zod validation twice.
- `MissingApiKeyError` — settings store has no `anthropic_api_key`.

**Important**: enrichment is **fire-and-forget** from the user's perspective.
The caller in `views/CoffeeView.tsx` invokes this in a `useEffect`
after-save; any thrown error sets the coffee's `enrichment_attempted_at`
without populating `enriched`. The user is **not** shown a blocking error
state for enrichment failure — the card simply lacks the enrichment
sections. This is by design: enrichment is additive, never required.

---

## Provider

- **Model**: `claude-sonnet-4-6`.
- **Endpoint**: `POST https://api.anthropic.com/v1/messages`.
- **Headers**: same as extraction contract.
- **Body** (illustrative):

```jsonc
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "tool_choice": { "type": "tool", "name": "record_coffee_enrichment" },
  "tools": [{
    "name": "record_coffee_enrichment",
    "description": "Provide additional context for a specialty coffee based on what was on its label. Return null for any field where you do not have reliable information — do not invent details.",
    "input_schema": { /* derived from EnrichedCoffeeSchema */ }
  }],
  "messages": [{
    "role": "user",
    "content": [{
      "type": "text",
      "text": "<rendered prompt referencing the effective ExtractedCoffee fields>"
    }]
  }]
}
```

**No image is sent** for enrichment — the photo is not relevant once
extraction has produced text.

---

## Tool definition (JSON Schema)

Derived at module load from `EnrichedCoffeeSchema` (Zod) via
`zod-to-json-schema`. **Never hand-written.** Single source of truth per
constitution Principle II.

```jsonc
{
  "type": "object",
  "properties": {
    "origin_story":     { "type": ["string", "null"] },
    "producer_context": { "type": ["string", "null"] },
    "brew_recommendation": {
      "oneOf": [
        { "type": "null" },
        {
          "type": "object",
          "properties": {
            "method":        { "type": "string" },
            "ratio":         { "type": "string" },
            "grind":         { "type": "string" },
            "temperature_c": { "type": ["integer", "null"] },
            "notes":         { "type": ["string", "null"] }
          },
          "required": ["method", "ratio", "grind", "temperature_c", "notes"],
          "additionalProperties": false
        }
      ]
    }
  },
  "required": ["origin_story", "producer_context", "brew_recommendation"],
  "additionalProperties": false
}
```

---

## Input preconditions

- `effective` is a valid `ExtractedCoffee` (already schema-validated upstream).
- Saved coffee record exists with the given `id` — the caller is responsible
  for the save → enrich ordering.
- API key present in settings.

---

## Output postconditions

`EnrichedCoffeeSchema.parse(toolUse.input)` succeeds. Any combination of
nulls is legal — including all three top-level fields being null
("nothing reliable to add"). This is the spec's no-fabrication rule
(FR-016) made explicit.

---

## Retry strategy

Same as extraction contract: no retry on HTTP errors; exactly 1 retry on
schema-validation failure with a 500 ms delay.

---

## Telemetry contract

Same shape as the extraction contract's `TelemetryRecord`, with:
- `call`: literal `'enrich_coffee_profile'`
- `input_image_bytes`: `null` (no image sent)

---

## Cost expectation

- Input: ~500 tokens (prompt + extracted fields).
- Output: ~300–600 tokens (sentences of context + structured brew rec).
- Approximate cost per call: **~$0.004**.

Combined with extraction: ~$0.01 per "add a coffee" action total. The dev
HUD aggregates per-session.

---

## Failure-mode UX contract

Enrichment failures are **silent to the user**.

| Outcome                       | What the user sees                                  |
|-------------------------------|-----------------------------------------------------|
| Schema valid, all fields populated | All enrichment sections render on the card.    |
| Schema valid, some fields null     | Only the populated sections render; nulls hidden. (FR-016) |
| Schema valid, all fields null      | No enrichment sections render. Card looks like a label-only coffee. |
| Network or schema error            | No enrichment sections; `enrichment_attempted_at` is set so the UI does not endlessly retry. |

The user can manually re-trigger enrichment via a "Refresh details" button
on the coffee detail view. (v1: optional — if cut, retry never happens; the
user can delete and re-scan.)

---

## Golden fixtures

`tests/ai-fixtures/enrichment/` with the same triplet structure as
extraction. Each fixture pairs a recorded model response with an expected
`EnrichedCoffee`. Validation tests re-parse the recorded response through
`EnrichedCoffeeSchema` and assert equality with the expected output.

---

## Idempotency

Enrichment is idempotent **per record**: invoking it twice on the same
saved coffee replaces the previous `enriched` value. We do not version or
diff enrichment results. If we ever want to A/B compare enrichment
versions, that's a future feature.
