import { z } from 'zod'
import { FLAVOUR_TAGS, MAX_FLAVOUR_TAGS, type FlavourTag } from '@/lib/flavours'

/**
 * Output schema for the structure_drink_note call (feature 006). Single source
 * of truth per constitution Principle II: this Zod object derives the tool's
 * JSON Schema (via zod-to-json-schema in client.ts) AND validates the response
 * at runtime. The flavour palette is a closed enum — off-palette words are
 * unrepresentable, so "jammy" can never be misassigned (FR-011).
 */
export const VoiceDrinkDraftSchema = z.object({
  /** Café / venue as spoken, leading "at/in" stripped; null if not mentioned. */
  venue: z.string().nullable(),
  /** The drink/coffee as spoken ("oat flat white"); null if not mentioned. */
  coffee_name: z.string().nullable(),
  /** Only an explicitly stated 1–5 rating; vague praise stays null. */
  rating: z.number().int().min(1).max(5).nullable(),
  /** Palette tags in order of mention. Cap enforced by normalizeDrinkDraft. */
  flavour_tags: z.array(
    z.enum(FLAVOUR_TAGS as [FlavourTag, ...FlavourTag[]]),
  ),
})

export type VoiceDrinkDraft = z.infer<typeof VoiceDrinkDraftSchema>

/**
 * Deterministic post-validation normalization (research D3): dedupe tags
 * preserving order of mention, then cap at the first MAX_FLAVOUR_TAGS. Removal
 * only — never adds or rewrites values — so a 4-tag response stays usable
 * instead of burning the schema retry. Persistence re-enforces the cap
 * independently via makeDrinkLog (defence in depth).
 */
export function normalizeDrinkDraft(draft: VoiceDrinkDraft): VoiceDrinkDraft {
  const seen = new Set<FlavourTag>()
  const tags: FlavourTag[] = []
  for (const tag of draft.flavour_tags) {
    if (seen.has(tag)) continue
    seen.add(tag)
    tags.push(tag)
    if (tags.length === MAX_FLAVOUR_TAGS) break
  }
  return { ...draft, flavour_tags: tags }
}

/**
 * True iff nothing usable was heard — routes to the "didn't catch that"
 * retryable UX (FR-016) via DrinkDraftEmptyError in client.ts. A draft with
 * any one field present proceeds to review.
 */
export function isEmptyDrinkDraft(draft: VoiceDrinkDraft): boolean {
  return (
    draft.venue === null &&
    draft.coffee_name === null &&
    draft.rating === null &&
    draft.flavour_tags.length === 0
  )
}
