import type { ZodTypeAny, z } from 'zod'
import { zodToJsonSchema } from 'zod-to-json-schema'
import { resolveApiKey, type KeySource } from '@/lib/apiKey'
import { record as recordTelemetry, type TelemetryRecord } from '@/lib/telemetry'
import { retryOnce } from '@/lib/retry'
import { resizeForVision } from '@/lib/image'
import {
  ExtractedCoffeeSchema,
  isEmptyExtraction,
  type ExtractedCoffee,
} from '@/ai/schemas/extraction'
import {
  EXTRACTION_TOOL_NAME,
  EXTRACTION_TOOL_DESCRIPTION,
  EXTRACTION_USER_PROMPT,
} from '@/ai/prompts/extraction'
import {
  EnrichedCoffeeSchema,
  type EnrichedCoffee,
} from '@/ai/schemas/enrichment'
import {
  ENRICHMENT_TOOL_NAME,
  ENRICHMENT_TOOL_DESCRIPTION,
  buildEnrichmentPrompt,
} from '@/ai/prompts/enrichment'
import {
  StructuredBrewSchema,
  isEmptyBrew,
  type StructuredBrew,
} from '@/ai/schemas/brew'
import {
  BREW_TOOL_NAME,
  BREW_TOOL_DESCRIPTION,
  buildBrewPrompt,
} from '@/ai/prompts/brew'

const ANTHROPIC_ENDPOINT = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
const MODEL_ID = 'claude-sonnet-4-6' as const
const RETRY_DELAY_MS = 500

export type ClaudeToolName =
  | 'record_coffee_label'
  | 'record_coffee_enrichment'
  | 'record_brew_log'

export class MissingApiKeyError extends Error {
  constructor() {
    super('No Anthropic API key is configured. Open Settings to add one.')
    this.name = 'MissingApiKeyError'
  }
}

export class ClaudeNetworkError extends Error {
  public readonly status: number
  /** Which credential was attached to the failed request (005 FR-008). */
  public readonly keySource: KeySource
  constructor(message: string, status: number, keySource: KeySource) {
    super(message)
    this.name = 'ClaudeNetworkError'
    this.status = status
    this.keySource = keySource
  }
}

export class ClaudeSchemaError extends Error {
  public readonly toolUseInput: unknown
  constructor(message: string, toolUseInput: unknown) {
    super(message)
    this.name = 'ClaudeSchemaError'
    this.toolUseInput = toolUseInput
  }
}

export interface AnthropicContentBlock {
  type: string
  // text block
  text?: string
  // tool_use block (assistant-side response)
  name?: string
  input?: unknown
  // image block (user-side request)
  source?: {
    type: 'base64'
    media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
    data: string
  }
}

export class ExtractionEmptyError extends Error {
  constructor() {
    super(
      'No fields could be read from the photo. Try a clearer photo or enter manually.',
    )
    this.name = 'ExtractionEmptyError'
  }
}

export class BrewEmptyError extends Error {
  constructor() {
    super("Didn't catch that — try again, or enter it by hand.")
    this.name = 'BrewEmptyError'
  }
}

interface AnthropicResponse {
  content: AnthropicContentBlock[]
  usage?: {
    input_tokens?: number
    output_tokens?: number
  }
}

export interface CallClaudeToolArgs<S extends ZodTypeAny> {
  call: TelemetryRecord['call']
  tool: ClaudeToolName
  toolDescription: string
  schema: S
  messages: Array<{ role: 'user'; content: AnthropicContentBlock[] }>
  inputImageBytes: number | null
  inputTextChars: number | null
}

/**
 * Generic Claude tool-use wrapper. All Claude calls in the app go through
 * this function so the retry policy, telemetry, and key handling stay in
 * one place. The credential comes from resolveApiKey() — personal (BYOK)
 * key first, then the build-time built-in key (005). Per constitution
 * Principle II: the JSON Schema sent to Claude is derived from the Zod
 * object via zod-to-json-schema — never hand-written.
 */
export async function callClaudeTool<S extends ZodTypeAny>(
  args: CallClaudeToolArgs<S>,
): Promise<z.infer<S>> {
  const { key: apiKey, source: keySource } = await resolveApiKey()
  if (!apiKey) throw new MissingApiKeyError()

  const inputSchema = zodToJsonSchema(args.schema, { target: 'jsonSchema7' })

  const body = {
    model: MODEL_ID,
    max_tokens: 1024,
    tool_choice: { type: 'tool', name: args.tool },
    tools: [
      {
        name: args.tool,
        description: args.toolDescription,
        input_schema: inputSchema,
      },
    ],
    messages: args.messages,
  }

  const startedAt = Date.now()
  let retried = false

  const runOnce = async (): Promise<{ parsed: z.infer<S>; tokens: number | null }> => {
    const res = await fetch(ANTHROPIC_ENDPOINT, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new ClaudeNetworkError(
        `Anthropic API returned ${res.status}: ${text.slice(0, 200)}`,
        res.status,
        keySource,
      )
    }

    const data = (await res.json()) as AnthropicResponse
    const tokens = data.usage?.output_tokens ?? null

    const toolUse = data.content.find(
      b => b.type === 'tool_use' && b.name === args.tool,
    )
    if (!toolUse) {
      throw new ClaudeSchemaError(
        `Expected a tool_use block targeting ${args.tool}; none found.`,
        data.content,
      )
    }

    const parsed = args.schema.safeParse(toolUse.input)
    if (!parsed.success) {
      throw new ClaudeSchemaError(
        `Tool input failed schema validation: ${parsed.error.message}`,
        toolUse.input,
      )
    }

    return { parsed: parsed.data, tokens }
  }

  try {
    const result = await retryOnce(
      runOnce,
      err => err instanceof ClaudeSchemaError,
      RETRY_DELAY_MS,
      () => {
        retried = true
      },
    )

    recordTelemetry({
      call: args.call,
      model_id: MODEL_ID,
      status: retried ? 'retry_then_ok' : 'ok',
      latency_ms: Date.now() - startedAt,
      input_image_bytes: args.inputImageBytes,
      input_text_chars: args.inputTextChars,
      output_tokens: result.tokens,
      retried,
      ts: new Date(startedAt).toISOString(),
    })

    return result.parsed
  } catch (err) {
    const status: TelemetryRecord['status'] =
      err instanceof ClaudeSchemaError ? 'schema_error' : 'network_error'

    recordTelemetry({
      call: args.call,
      model_id: MODEL_ID,
      status,
      latency_ms: Date.now() - startedAt,
      input_image_bytes: args.inputImageBytes,
      input_text_chars: args.inputTextChars,
      output_tokens: null,
      retried,
      ts: new Date(startedAt).toISOString(),
    })

    throw err
  }
}

/**
 * Extract structured label fields from a coffee bag photo.
 *
 * Throws:
 *   - MissingApiKeyError if no key is available (neither personal nor built-in)
 *   - ClaudeNetworkError on non-2xx HTTP response
 *   - ClaudeSchemaError if the model's tool_use input fails Zod validation
 *     twice in a row (per Principle V retry policy)
 *   - ExtractionEmptyError if the model returned schema-valid data with
 *     every scalar null and no tasting notes (FR-007 — total failure)
 */
export async function extractCoffeeLabel(
  imageDataUrl: string,
): Promise<ExtractedCoffee> {
  const resized = await resizeForVision(imageDataUrl)
  const base64 = stripDataUrlPrefix(resized)
  const mediaType = mediaTypeFromDataUrl(resized)

  const result = await callClaudeTool({
    call: 'extract_coffee_label',
    tool: EXTRACTION_TOOL_NAME,
    toolDescription: EXTRACTION_TOOL_DESCRIPTION,
    schema: ExtractedCoffeeSchema,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: base64 },
          },
          { type: 'text', text: EXTRACTION_USER_PROMPT },
        ],
      },
    ],
    inputImageBytes: base64.length,
    inputTextChars: null,
  })

  if (isEmptyExtraction(result)) throw new ExtractionEmptyError()
  return result
}

function stripDataUrlPrefix(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(',')
  return commaIdx === -1 ? dataUrl : dataUrl.slice(commaIdx + 1)
}

/**
 * Layer additional context on top of an extracted coffee: origin story,
 * producer context, and a brew recommendation. Per the enrichment contract,
 * this is FIRE-AND-FORGET from the user's perspective — failures should be
 * caught by the caller and surface as no enrichment sections, not as a
 * blocking error.
 *
 * Throws:
 *   - MissingApiKeyError if no key is available (neither personal nor built-in)
 *   - ClaudeNetworkError on non-2xx HTTP response
 *   - ClaudeSchemaError if the model's tool_use input fails Zod validation twice
 */
export async function enrichCoffeeProfile(
  effective: ExtractedCoffee,
): Promise<EnrichedCoffee> {
  return callClaudeTool({
    call: 'enrich_coffee_profile',
    tool: ENRICHMENT_TOOL_NAME,
    toolDescription: ENRICHMENT_TOOL_DESCRIPTION,
    schema: EnrichedCoffeeSchema,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: buildEnrichmentPrompt(effective) }],
      },
    ],
    inputImageBytes: null,
    inputTextChars: null,
  })
}

/**
 * Structure a raw spoken brew transcript into typed brew parameters. Exactly
 * one Claude call per brew log (constitution Principle V). Text-only: no image.
 *
 * Throws:
 *   - MissingApiKeyError if no key is available (neither personal nor built-in)
 *   - ClaudeNetworkError on non-2xx HTTP response (caller falls back to the
 *     manual form pre-filled with the transcript — no data loss)
 *   - ClaudeSchemaError if the tool_use input fails Zod validation twice
 *   - BrewEmptyError if schema-valid but every field is null (FR-008)
 */
export async function structureBrewNote(
  transcript: string,
): Promise<StructuredBrew> {
  const result = await callClaudeTool({
    call: 'structure_brew_note',
    tool: BREW_TOOL_NAME,
    toolDescription: BREW_TOOL_DESCRIPTION,
    schema: StructuredBrewSchema,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: buildBrewPrompt(transcript) }],
      },
    ],
    inputImageBytes: null,
    inputTextChars: transcript.length,
  })

  if (isEmptyBrew(result)) throw new BrewEmptyError()
  return result
}

function mediaTypeFromDataUrl(
  dataUrl: string,
): 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' {
  const match = dataUrl.match(/^data:(image\/[a-z]+);/)
  const detected = match?.[1]
  if (
    detected === 'image/jpeg' ||
    detected === 'image/png' ||
    detected === 'image/webp' ||
    detected === 'image/gif'
  ) {
    return detected
  }
  return 'image/jpeg'
}
