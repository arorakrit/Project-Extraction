import { ExtractedCoffeeSchema } from '@/ai/schemas/extraction'

export const EXTRACTION_TOOL_NAME = 'record_coffee_label' as const

export const EXTRACTION_TOOL_DESCRIPTION =
  'Record the fields you can read from the coffee bag label. Set a field to null if you cannot read it confidently. Tasting notes is an array (possibly empty). Do not fabricate fields that are not visible.'

export const EXTRACTION_USER_PROMPT =
  'Read this specialty coffee bag label and call the record_coffee_label tool with what you can see. Set any field you cannot read confidently to null. Do not infer or guess fields that are not visible on the bag. Tasting notes is an array — return an empty array if none are printed.'

// The schema is the single source of truth. src/ai/client.ts derives the
// tool's input_schema from this Zod object via zod-to-json-schema at module
// load (constitution Principle II — no parallel hand-written shapes).
export const EXTRACTION_SCHEMA = ExtractedCoffeeSchema
