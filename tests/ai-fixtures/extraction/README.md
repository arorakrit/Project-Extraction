# Extraction golden fixtures

Each subdirectory is a triplet:

- `input.image-meta.json` — metadata about the source image (NOT the bytes)
- `recorded-response.json` — the full Anthropic API response that was captured
- `expected-output.json` — what `ExtractedCoffeeSchema.parse(toolUseBlock.input)` should produce

The fixture-replay test (`tests/unit/ai/extraction-fixtures.test.ts`) iterates over every subdirectory, locates the `tool_use` block in `recorded-response.json`, validates its `input` through the live Zod schema, and asserts deep equality with `expected-output.json`.

**This is the regression net** for any prompt or schema change (constitution Principle II — workflow gate).

## When to update

- A change to `ExtractedCoffeeSchema` MUST ship with at least one updated fixture.
- A change to the extraction prompt SHOULD be paired with a re-recording of at least one fixture, with `expected-output.json` updated to match the new model behavior.

## How to record a new fixture

1. Start the app: `npm run dev`.
2. Configure your Anthropic key in Settings.
3. Capture a real coffee bag.
4. In DevTools Network tab, locate the `POST /v1/messages` request and copy its full JSON response.
5. Save it as `recorded-response.json` under a new subdirectory (e.g., `tests/ai-fixtures/extraction/colombia-huila/`).
6. Compute the expected validated output by running the response through `ExtractedCoffeeSchema` (locally), save as `expected-output.json`.
7. Document the image source in `input.image-meta.json` (do NOT commit the image bytes themselves).
8. Run `npm run test` — the fixture-replay test will pick it up automatically.

## Hand-crafted vs. recorded

The `ethiopia-yirgacheffe` fixture was hand-crafted from knowledge of typical Yirgacheffe label content as a starter sample; it has not yet been replaced with a real recorded response from `claude-sonnet-4-6`. Subsequent fixtures should be real recordings.
