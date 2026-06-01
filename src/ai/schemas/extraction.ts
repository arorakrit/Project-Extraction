import { z } from 'zod'

export const ExtractedCoffeeSchema = z.object({
  roaster_name: z.string().nullable(),
  coffee_name: z.string().nullable(),
  origin_country: z.string().nullable(),
  origin_region: z.string().nullable(),
  variety: z.string().nullable(),
  process: z.string().nullable(),
  roast_level: z.string().nullable(),
  tasting_notes: z.array(z.string()),
})

export type ExtractedCoffee = z.infer<typeof ExtractedCoffeeSchema>

/**
 * True iff every scalar field is null AND tasting_notes is empty. Used to
 * route the total-failure case to the error UX (FR-007). Distinct from
 * Zod parse failure, which means the model returned a malformed shape.
 */
export function isEmptyExtraction(extracted: ExtractedCoffee): boolean {
  return (
    extracted.roaster_name === null &&
    extracted.coffee_name === null &&
    extracted.origin_country === null &&
    extracted.origin_region === null &&
    extracted.variety === null &&
    extracted.process === null &&
    extracted.roast_level === null &&
    extracted.tasting_notes.length === 0
  )
}
