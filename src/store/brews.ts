import { getDB } from './db'
import type { StructuredBrew } from '@/ai/schemas/brew'

export type BrewUserEdits = Partial<StructuredBrew>

export interface BrewLogEntry {
  /** UUID v4; client-generated via crypto.randomUUID(). Store keyPath. */
  id: string
  /** FK → SavedCoffee.id. Indexed (by_coffee). */
  coffee_id: string
  /** ISO 8601 of when the brew was logged. Timeline sort key (descending). */
  logged_at: string
  /** How the entry was created. */
  source: 'voice' | 'manual'
  /** Raw recognized speech for voice entries; null for manual. */
  transcript: string | null
  /** AI's (or manual first-pass) structured view. Immutable after addBrew. */
  structured: StructuredBrew
  /** User overrides applied on top of structured. */
  user_edits: BrewUserEdits
  /** Record schema version (independent of the DB version). */
  schema_version: 1
}

const STORE = 'brews' as const

export class StaleBrewSchemaError extends Error {
  public readonly id: string
  public readonly version: number
  constructor(id: string, version: number) {
    super(`Brew ${id} has unknown schema_version ${version}; refusing to read.`)
    this.name = 'StaleBrewSchemaError'
    this.id = id
    this.version = version
  }
}

export async function addBrew(entry: BrewLogEntry): Promise<void> {
  if (entry.schema_version !== 1) {
    throw new Error(
      `Refusing to write brew with schema_version ${entry.schema_version}`,
    )
  }
  const db = await getDB()
  await db.add(STORE, entry)
}

export async function getBrew(id: string): Promise<BrewLogEntry | null> {
  const db = await getDB()
  const row = (await db.get(STORE, id)) as BrewLogEntry | undefined
  if (!row) return null
  if (row.schema_version !== 1) throw new StaleBrewSchemaError(id, row.schema_version)
  return row
}

export async function listBrewsForCoffee(
  coffeeId: string,
): Promise<BrewLogEntry[]> {
  const db = await getDB()
  const rows = (await db.getAllFromIndex(
    STORE,
    'by_coffee',
    coffeeId,
  )) as BrewLogEntry[]
  return rows
    .filter(b => b.schema_version === 1)
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
}

/**
 * Update an existing brew's mutable fields. Only `user_edits` is exposed —
 * `structured`, `source`, `transcript`, `coffee_id`, and `logged_at` are
 * invariant after creation (data-model.md, parallels updateCoffee).
 */
export async function updateBrew(
  id: string,
  partial: { user_edits?: BrewUserEdits },
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const existing = (await tx.store.get(id)) as BrewLogEntry | undefined
  if (!existing) {
    await tx.done
    throw new Error(`Brew ${id} not found`)
  }
  const updated: BrewLogEntry = {
    ...existing,
    ...(partial.user_edits !== undefined && { user_edits: partial.user_edits }),
  }
  await tx.store.put(updated)
  await tx.done
}

export async function deleteBrew(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}

export async function deleteBrewsForCoffee(coffeeId: string): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const keys = await tx.store.index('by_coffee').getAllKeys(coffeeId)
  for (const key of keys) {
    await tx.store.delete(key)
  }
  await tx.done
}

const BREW_KEYS: Array<keyof StructuredBrew> = [
  'brew_method',
  'dose_g',
  'water_g',
  'ratio',
  'grind',
  'water_temp_c',
  'total_time_s',
  'tasting_note',
]

/**
 * Merge user_edits over structured to produce the effective brew shown to the
 * user. Uses `'field' in user_edits` presence checks so an explicit null edit
 * is honored (mirrors effectiveExtractedCoffee).
 */
export function effectiveBrew(entry: BrewLogEntry): StructuredBrew {
  const { structured, user_edits } = entry
  const pick = <K extends keyof StructuredBrew>(key: K): StructuredBrew[K] =>
    key in user_edits
      ? ((user_edits[key] ?? null) as StructuredBrew[K])
      : structured[key]
  return Object.fromEntries(
    BREW_KEYS.map(key => [key, pick(key)]),
  ) as unknown as StructuredBrew
}

/**
 * Compute the user_edits override: the fields where the edited draft diverges
 * from the immutable AI/first-pass `structured`. Key presence marks an explicit
 * edit, so an edit back to null is honored by effectiveBrew. Shared by the
 * review (US1) and edit (US2) flows so both produce identical overrides.
 */
export function brewEditsFrom(
  structured: StructuredBrew,
  draft: StructuredBrew,
): BrewUserEdits {
  const edits: BrewUserEdits = {}
  for (const key of BREW_KEYS) {
    if (draft[key] !== structured[key]) {
      ;(edits as Record<string, unknown>)[key] = draft[key]
    }
  }
  return edits
}
