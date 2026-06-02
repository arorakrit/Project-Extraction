import { z } from 'zod'

export const BrewRecommendationSchema = z.object({
  method: z.string(),
  ratio: z.string(),
  grind: z.string(),
  temperature_c: z.number().int().nullable(),
  notes: z.string().nullable(),
})

export type BrewRecommendation = z.infer<typeof BrewRecommendationSchema>

export const EnrichedCoffeeSchema = z.object({
  origin_story: z.string().nullable(),
  producer_context: z.string().nullable(),
  brew_recommendation: BrewRecommendationSchema.nullable(),
})

export type EnrichedCoffee = z.infer<typeof EnrichedCoffeeSchema>
