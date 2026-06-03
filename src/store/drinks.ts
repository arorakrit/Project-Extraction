import { getDB } from './db'
import { FLAVOUR_TAGS, MAX_FLAVOUR_TAGS, type FlavourTag } from '@/lib/flavours'

export type Process = 'washed' | 'natural' | 'honey'
export type RoastLevel = 'light' | 'medium' | 'dark'
export type Rating = 1 | 2 | 3 | 4 | 5

export const PROCESSES: readonly Process[] = ['washed', 'natural', 'honey']
export const ROAST_LEVELS: readonly RoastLevel[] = ['light', 'medium', 'dark']

const MAX_NAME = 120
const MAX_VENUE = 120
const MAX_ORIGIN = 80

/**
 * A single manually-logged tasting. Standalone — no FK to coffees/brews.
 * Stored in the `drinks` object store (keyPath 'id'). Append-only for this
 * feature (no edit transition; see data-model.md).
 */
export interface DrinkLog {
  /** UUID v4; client-generated via crypto.randomUUID(). Store keyPath. */
  id: string
  /** ISO 8601 of when the drink was logged. History sort key (descending). */
  logged_at: string
  /** 1–5 stars. The only user-required field. */
  rating: Rating
  coffee_name: string | null
  /** Café / roaster stand / event name. Powers listVenues() suggestions. */
  venue: string | null
  origin_country: string | null
  process: Process | null
  roast_level: RoastLevel | null
  /** 0–3 unique palette tags. */
  flavour_tags: FlavourTag[]
  /** Record schema version (independent of the DB version). */
  schema_version: 1
}

/** Caller-supplied fields; id/logged_at/schema_version are assigned by makeDrinkLog. */
export interface DrinkInput {
  rating: number
  coffee_name?: string | null
  venue?: string | null
  origin_country?: string | null
  process?: Process | null
  roast_level?: RoastLevel | null
  flavour_tags?: FlavourTag[]
}

const STORE = 'drinks' as const

export class StaleDrinkSchemaError extends Error {
  public readonly id: string
  public readonly version: number
  constructor(id: string, version: number) {
    super(`Drink ${id} has unknown schema_version ${version}; refusing to read.`)
    this.name = 'StaleDrinkSchemaError'
    this.id = id
    this.version = version
  }
}

function normalizeString(
  value: string | null | undefined,
  max: number,
): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  if (trimmed === '') return null
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

/**
 * Pure factory + validator. Assigns id / logged_at / schema_version, trims and
 * null-normalizes strings (clamped to max length), and validates the
 * constrained fields. THROWS on an invalid rating, a flavour-tag set that is
 * too large / duplicated / off-palette, or an unrecognized process/roast.
 */
export function makeDrinkLog(input: DrinkInput): DrinkLog {
  const { rating } = input
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error(`Invalid rating ${String(rating)}; must be an integer 1–5`)
  }

  const tags = input.flavour_tags ?? []
  if (tags.length > MAX_FLAVOUR_TAGS) {
    throw new Error(
      `Too many flavour tags (${tags.length}); max ${MAX_FLAVOUR_TAGS}`,
    )
  }
  if (new Set(tags).size !== tags.length) {
    throw new Error('Duplicate flavour tags are not allowed')
  }
  for (const tag of tags) {
    if (!(FLAVOUR_TAGS as readonly string[]).includes(tag)) {
      throw new Error(`Unknown flavour tag "${tag}"`)
    }
  }

  const process = input.process ?? null
  if (process !== null && !(PROCESSES as readonly string[]).includes(process)) {
    throw new Error(`Unknown process "${process}"`)
  }
  const roastLevel = input.roast_level ?? null
  if (
    roastLevel !== null &&
    !(ROAST_LEVELS as readonly string[]).includes(roastLevel)
  ) {
    throw new Error(`Unknown roast level "${roastLevel}"`)
  }

  return {
    id: crypto.randomUUID(),
    logged_at: new Date().toISOString(),
    rating: rating as Rating,
    coffee_name: normalizeString(input.coffee_name, MAX_NAME),
    venue: normalizeString(input.venue, MAX_VENUE),
    origin_country: normalizeString(input.origin_country, MAX_ORIGIN),
    process,
    roast_level: roastLevel,
    flavour_tags: [...tags],
    schema_version: 1,
  }
}

export async function addDrink(entry: DrinkLog): Promise<void> {
  if (entry.schema_version !== 1) {
    throw new Error(
      `Refusing to write drink with schema_version ${entry.schema_version}`,
    )
  }
  const db = await getDB()
  await db.add(STORE, entry)
}

export async function getDrink(id: string): Promise<DrinkLog | null> {
  const db = await getDB()
  const row = (await db.get(STORE, id)) as DrinkLog | undefined
  if (!row) return null
  if (row.schema_version !== 1) throw new StaleDrinkSchemaError(id, row.schema_version)
  return row
}

/** All drinks (schema_version 1 only), newest first. */
export async function listDrinks(): Promise<DrinkLog[]> {
  const db = await getDB()
  const rows = (await db.getAll(STORE)) as DrinkLog[]
  return rows
    .filter(d => d.schema_version === 1)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
}

export async function deleteDrink(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}

/**
 * Distinct, non-null, trimmed venue strings across all drinks, de-duplicated
 * case-insensitively (first-seen casing kept), ordered most-recent first.
 * Powers the VenueInput type-ahead (FR-004/FR-005).
 */
export async function listVenues(): Promise<string[]> {
  const drinks = await listDrinks() // already newest-first
  const seen = new Set<string>()
  const venues: string[] = []
  for (const drink of drinks) {
    if (drink.venue == null) continue
    const key = drink.venue.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    venues.push(drink.venue)
  }
  return venues
}
