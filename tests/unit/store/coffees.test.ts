import { beforeEach, describe, expect, it } from 'vitest'
import {
  addCoffee,
  deleteCoffee,
  getCoffee,
  listCoffees,
  updateCoffee,
  type SavedCoffee,
} from '@/store/coffees'
import { getDB } from '@/store/db'

function mkCoffee(overrides: Partial<SavedCoffee> = {}): SavedCoffee {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    captured_at: overrides.captured_at ?? new Date().toISOString(),
    source_image_data_url: overrides.source_image_data_url ?? null,
    extracted: overrides.extracted ?? {
      roaster_name: 'Roaster',
      coffee_name: 'Coffee',
      origin_country: 'Country',
      origin_region: null,
      variety: null,
      process: null,
      roast_level: null,
      tasting_notes: [],
    },
    user_edits: overrides.user_edits ?? {},
    enriched: overrides.enriched ?? null,
    enrichment_attempted_at: overrides.enrichment_attempted_at ?? null,
    schema_version: 1,
  }
}

describe('coffees store', () => {
  beforeEach(async () => {
    const db = await getDB()
    await db.clear('coffees')
  })

  it('addCoffee → getCoffee round-trips', async () => {
    const c = mkCoffee({ id: 'c1' })
    await addCoffee(c)
    expect(await getCoffee('c1')).toEqual(c)
  })

  it('getCoffee returns null for missing id', async () => {
    expect(await getCoffee('does-not-exist')).toBeNull()
  })

  it('listCoffees returns newest-first by captured_at', async () => {
    const older = mkCoffee({
      id: 'older',
      captured_at: '2024-01-01T00:00:00.000Z',
    })
    const newer = mkCoffee({
      id: 'newer',
      captured_at: '2025-01-01T00:00:00.000Z',
    })
    await addCoffee(older)
    await addCoffee(newer)
    const list = await listCoffees()
    expect(list.map(c => c.id)).toEqual(['newer', 'older'])
  })

  it('listCoffees on empty store returns []', async () => {
    expect(await listCoffees()).toEqual([])
  })

  it('updateCoffee can update mutable fields without touching extracted', async () => {
    const initial = mkCoffee({ id: 'c2' })
    await addCoffee(initial)

    await updateCoffee('c2', {
      user_edits: { roaster_name: 'User-overridden roaster' },
      enriched: { origin_story: 'A short story.' },
      enrichment_attempted_at: '2025-05-30T12:00:00.000Z',
    })

    const got = await getCoffee('c2')
    expect(got).not.toBeNull()
    expect(got!.user_edits.roaster_name).toBe('User-overridden roaster')
    expect(got!.enriched).toEqual({ origin_story: 'A short story.' })
    expect(got!.enrichment_attempted_at).toBe('2025-05-30T12:00:00.000Z')
    // Invariant: extracted is unchanged.
    expect(got!.extracted).toEqual(initial.extracted)
  })

  it('updateCoffee with partial only updates specified fields', async () => {
    const initial = mkCoffee({
      id: 'c3',
      user_edits: { coffee_name: 'pre-existing-edit' },
      enrichment_attempted_at: '2025-04-01T00:00:00.000Z',
    })
    await addCoffee(initial)

    await updateCoffee('c3', { enriched: { foo: 'bar' } })

    const got = await getCoffee('c3')
    expect(got!.user_edits).toEqual({ coffee_name: 'pre-existing-edit' })
    expect(got!.enriched).toEqual({ foo: 'bar' })
    expect(got!.enrichment_attempted_at).toBe('2025-04-01T00:00:00.000Z')
    expect(got!.extracted).toEqual(initial.extracted)
  })

  it('updateCoffee throws when the record does not exist', async () => {
    await expect(
      updateCoffee('does-not-exist', { user_edits: { roaster_name: 'x' } }),
    ).rejects.toThrow('Coffee does-not-exist not found')
  })

  it('deleteCoffee removes the record', async () => {
    const c = mkCoffee({ id: 'c4' })
    await addCoffee(c)
    expect(await getCoffee('c4')).not.toBeNull()
    await deleteCoffee('c4')
    expect(await getCoffee('c4')).toBeNull()
  })

  it('addCoffee rejects non-1 schema_version', async () => {
    const bad = { ...mkCoffee(), schema_version: 99 as unknown as 1 }
    await expect(addCoffee(bad)).rejects.toThrow('Refusing to write')
  })
})
