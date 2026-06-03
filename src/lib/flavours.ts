/**
 * Fixed flavour-tag palette for manual drink logging (feature 003).
 * The palette is intentionally closed for this feature — custom user-defined
 * tags are out of scope (see specs/003-log-a-drink/spec.md Assumptions).
 */

export type FlavourTag =
  | 'fruity'
  | 'floral'
  | 'chocolatey'
  | 'nutty'
  | 'bright'
  | 'heavy'

/** Palette order as presented in the picker. */
export const FLAVOUR_TAGS: readonly FlavourTag[] = [
  'fruity',
  'floral',
  'chocolatey',
  'nutty',
  'bright',
  'heavy',
]

/** Display labels (single source of truth for picker + history rendering). */
export const FLAVOUR_LABELS: Record<FlavourTag, string> = {
  fruity: 'Fruity',
  floral: 'Floral',
  chocolatey: 'Chocolatey',
  nutty: 'Nutty',
  bright: 'Bright',
  heavy: 'Heavy',
}

/** A drink may carry at most this many flavour tags. */
export const MAX_FLAVOUR_TAGS = 3

export function isFlavourTag(value: string): value is FlavourTag {
  return (FLAVOUR_TAGS as readonly string[]).includes(value)
}
