import { StructuredBrewSchema } from '@/ai/schemas/brew'

export const BREW_TOOL_NAME = 'record_brew_log' as const

export const BREW_TOOL_DESCRIPTION =
  'Record the brew parameters the user stated in their note. Set a field to null if they did not state it — never invent values. Use grams for dose and water, Celsius for temperature, and whole seconds for total time (convert e.g. "two and a half minutes" to 150). Capture the descriptive tail as the tasting note.'

export function buildBrewPrompt(transcript: string): string {
  return `Here is a spoken brew note. Call ${BREW_TOOL_NAME} with what the user actually said. Do not invent values they did not mention.\n\nNOTE: "${transcript}"`
}

// The schema is the single source of truth. src/ai/client.ts derives the tool's
// input_schema from this Zod object via zod-to-json-schema at module load
// (constitution Principle II — no parallel hand-written shapes).
export const BREW_SCHEMA = StructuredBrewSchema
