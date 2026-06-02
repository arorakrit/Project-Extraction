import type { ExtractedCoffee } from '@/ai/schemas/extraction'
import { EnrichedCoffeeSchema } from '@/ai/schemas/enrichment'

export const ENRICHMENT_TOOL_NAME = 'record_coffee_enrichment' as const

export const ENRICHMENT_TOOL_DESCRIPTION =
  'Provide additional context for a specialty coffee based on what was on its label. Return null for any field where you do not have reliable information — do not invent details. brew_recommendation may be null if no confident recommendation can be made.'

/**
 * Build the per-coffee user-message text. Embeds the effective (post-edit)
 * label fields so the model has everything it needs to enrich.
 */
export function buildEnrichmentPrompt(effective: ExtractedCoffee): string {
  const lines = [
    'Provide additional context for this specialty coffee. Set any field to null where you do not have reliable, well-known information — do not invent or guess details. Quality over completeness.',
    '',
    'Known fields from the bag label:',
    `- Roaster: ${effective.roaster_name ?? '(unknown)'}`,
    `- Coffee: ${effective.coffee_name ?? '(unknown)'}`,
    `- Origin country: ${effective.origin_country ?? '(unknown)'}`,
    `- Origin region: ${effective.origin_region ?? '(unknown)'}`,
    `- Variety: ${effective.variety ?? '(unknown)'}`,
    `- Process: ${effective.process ?? '(unknown)'}`,
    `- Roast level: ${effective.roast_level ?? '(unknown)'}`,
    `- Tasting notes: ${
      effective.tasting_notes.length > 0
        ? effective.tasting_notes.join(', ')
        : '(none)'
    }`,
    '',
    'Call the record_coffee_enrichment tool with what you can reliably say about this coffee. A brief origin story is good when the region is well-known. A producer/farm context is good when the producer name is identifiable. A brew recommendation is good when the process and roast suggest a clear starting point. Otherwise leave fields null.',
  ]
  return lines.join('\n')
}

// The schema is the single source of truth. src/ai/client.ts derives the
// tool's input_schema from this Zod object via zod-to-json-schema at module
// load (constitution Principle II — no parallel hand-written shapes).
export const ENRICHMENT_SCHEMA = EnrichedCoffeeSchema
