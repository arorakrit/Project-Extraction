import { getDB } from './db'
import type { ExtractedCoffee } from '@/ai/schemas/extraction'

export type UserEditedFields = Partial<ExtractedCoffee>

/**
 * Story-2 stub. Refined to `EnrichedCoffee` from `src/ai/schemas/enrichment.ts`
 * when Story 3 (T044) lands. Story 2 only writes `null` here.
 */
export type EnrichedSnapshot = Record<string, unknown>

export interface SavedCoffee {
  /** UUID v4; client-generated via crypto.randomUUID(). */
  id: string
  /** ISO 8601 of the capture (not the save). */
  captured_at: string
  /** Resized JPEG data URL; null when entered manually with no photo. */
  source_image_data_url: string | null
  /** AI's view of the label. Immutable after addCoffee. */
  extracted: ExtractedCoffee
  /** User's overrides applied on top of extracted. */
  user_edits: UserEditedFields
  /** Populated by Story 3 enrichment. Null until then. */
  enriched: EnrichedSnapshot | null
  /** ISO 8601 of last enrichment attempt; null if never tried. */
  enrichment_attempted_at: string | null
  /** Schema version of this record. Currently 1. */
  schema_version: 1
}

const STORE = 'coffees' as const

export class StaleSchemaError extends Error {
  public readonly id: string
  public readonly version: number
  constructor(id: string, version: number) {
    super(`Coffee ${id} has unknown schema_version ${version}; refusing to read.`)
    this.name = 'StaleSchemaError'
    this.id = id
    this.version = version
  }
}

export async function addCoffee(coffee: SavedCoffee): Promise<void> {
  if (coffee.schema_version !== 1) {
    throw new Error(
      `Refusing to write coffee with schema_version ${coffee.schema_version}`,
    )
  }
  const db = await getDB()
  await db.add(STORE, coffee)
}

export async function getCoffee(id: string): Promise<SavedCoffee | null> {
  const db = await getDB()
  const row = (await db.get(STORE, id)) as SavedCoffee | undefined
  if (!row) return null
  if (row.schema_version !== 1) throw new StaleSchemaError(id, row.schema_version)
  return row
}

export async function listCoffees(): Promise<SavedCoffee[]> {
  const db = await getDB()
  const rows = (await db.getAll(STORE)) as SavedCoffee[]
  return rows
    .filter(c => c.schema_version === 1)
    .sort((a, b) => b.captured_at.localeCompare(a.captured_at))
}

export type CoffeeUpdate = {
  user_edits?: UserEditedFields
  enriched?: EnrichedSnapshot | null
  enrichment_attempted_at?: string | null
}

/**
 * Update an existing coffee's mutable fields. `extracted` is invariant after
 * `addCoffee` and is intentionally NOT exposed here (data-model.md invariant).
 */
export async function updateCoffee(
  id: string,
  partial: CoffeeUpdate,
): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE, 'readwrite')
  const existing = (await tx.store.get(id)) as SavedCoffee | undefined
  if (!existing) {
    await tx.done
    throw new Error(`Coffee ${id} not found`)
  }
  const updated: SavedCoffee = {
    ...existing,
    ...(partial.user_edits !== undefined && { user_edits: partial.user_edits }),
    ...(partial.enriched !== undefined && { enriched: partial.enriched }),
    ...(partial.enrichment_attempted_at !== undefined && {
      enrichment_attempted_at: partial.enrichment_attempted_at,
    }),
  }
  await tx.store.put(updated)
  await tx.done
}

export async function deleteCoffee(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE, id)
}
