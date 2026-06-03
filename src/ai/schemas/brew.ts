import { z } from 'zod'

export const StructuredBrewSchema = z.object({
  brew_method: z.string().nullable(),
  dose_g: z.number().nullable(),
  water_g: z.number().nullable(),
  ratio: z.number().nullable(),
  grind: z.string().nullable(),
  water_temp_c: z.number().nullable(),
  total_time_s: z.number().int().nullable(),
  tasting_note: z.string().nullable(),
})

export type StructuredBrew = z.infer<typeof StructuredBrewSchema>

/** An all-null brew, the starting point for manual entry. */
export function emptyBrew(): StructuredBrew {
  return {
    brew_method: null,
    dose_g: null,
    water_g: null,
    ratio: null,
    grind: null,
    water_temp_c: null,
    total_time_s: null,
    tasting_note: null,
  }
}

/**
 * True iff every field is null — routes to the "didn't catch that" UX (FR-008).
 * Distinct from a Zod parse failure, which means the model returned a malformed
 * shape. A note that is only tasting language (tasting_note set, all params null)
 * is NOT empty and proceeds to review.
 */
export function isEmptyBrew(b: StructuredBrew): boolean {
  return (
    b.brew_method === null &&
    b.dose_g === null &&
    b.water_g === null &&
    b.ratio === null &&
    b.grind === null &&
    b.water_temp_c === null &&
    b.total_time_s === null &&
    b.tasting_note === null
  )
}
