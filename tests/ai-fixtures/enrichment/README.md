# Enrichment golden fixtures

Same shape as the extraction fixtures (see `../extraction/README.md`):

- `input.image-meta.json` — metadata about the inputs (NO image is sent for enrichment; this file documents the extracted coffee that fed the prompt).
- `recorded-response.json` — the full Anthropic API response that was captured.
- `expected-output.json` — what `EnrichedCoffeeSchema.parse(toolUseBlock.input)` should produce.

The fixture-replay test (`tests/unit/ai/enrichment-fixtures.test.ts`) iterates over every subdirectory, locates the `tool_use` block named `record_coffee_enrichment` in `recorded-response.json`, validates its `input` through the live Zod schema, and asserts deep equality with `expected-output.json`.

**This is the regression net** for any prompt or schema change to enrichment (constitution Principle II workflow gate).

## When to update

- A change to `EnrichedCoffeeSchema` MUST ship with at least one updated fixture.
- A change to `buildEnrichmentPrompt` SHOULD be paired with a re-recording of at least one fixture, with `expected-output.json` updated to match the new model behavior.

## Hand-crafted vs. recorded

The `ethiopia-yirgacheffe` fixture was hand-crafted as a starter sample. Subsequent fixtures should be real recordings produced via `npm run dev` and the DevTools Network tab.
