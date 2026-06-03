import { beforeEach, describe, expect, it } from 'vitest'
import {
  addBrew,
  deleteBrew,
  deleteBrewsForCoffee,
  effectiveBrew,
  getBrew,
  listBrewsForCoffee,
  updateBrew,
  type BrewLogEntry,
} from '@/store/brews'
import type { StructuredBrew } from '@/ai/schemas/brew'
import { getDB } from '@/store/db'

const STRUCTURED: StructuredBrew = {
  brew_method: 'V60',
  dose_g: 18,
  water_g: 300,
  ratio: null,
  grind: 'medium-fine',
  water_temp_c: 94,
  total_time_s: 150,
  tasting_note: 'bright and floral',
}

function mkBrew(overrides: Partial<BrewLogEntry> = {}): BrewLogEntry {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    coffee_id: overrides.coffee_id ?? 'coffee-1',
    logged_at: overrides.logged_at ?? new Date().toISOString(),
    source: overrides.source ?? 'voice',
    transcript: overrides.transcript ?? 'V60, eighteen in, three hundred out',
    structured: overrides.structured ?? STRUCTURED,
    user_edits: overrides.user_edits ?? {},
    schema_version: 1,
  }
}

describe('brews store', () => {
  beforeEach(async () => {
    const db = await getDB()
    await db.clear('brews')
  })

  it('addBrew → getBrew round-trips', async () => {
    const b = mkBrew({ id: 'b1' })
    await addBrew(b)
    expect(await getBrew('b1')).toEqual(b)
  })

  it('getBrew returns null for missing id', async () => {
    expect(await getBrew('nope')).toBeNull()
  })

  it('addBrew rejects non-1 schema_version', async () => {
    const bad = { ...mkBrew(), schema_version: 9 as unknown as 1 }
    await expect(addBrew(bad)).rejects.toThrow('Refusing to write')
  })

  it('listBrewsForCoffee returns only the matching coffee newest-first', async () => {
    await addBrew(
      mkBrew({ id: 'old', coffee_id: 'c1', logged_at: '2026-01-01T00:00:00.000Z' }),
    )
    await addBrew(
      mkBrew({ id: 'new', coffee_id: 'c1', logged_at: '2026-02-01T00:00:00.000Z' }),
    )
    await addBrew(mkBrew({ id: 'other', coffee_id: 'c2' }))
    const list = await listBrewsForCoffee('c1')
    expect(list.map(b => b.id)).toEqual(['new', 'old'])
  })

  it('listBrewsForCoffee returns [] for a coffee with no brews', async () => {
    expect(await listBrewsForCoffee('empty')).toEqual([])
  })

  it('updateBrew changes user_edits but never structured', async () => {
    const b = mkBrew({ id: 'b2' })
    await addBrew(b)
    await updateBrew('b2', { user_edits: { grind: 'finer' } })
    const got = await getBrew('b2')
    expect(got!.user_edits).toEqual({ grind: 'finer' })
    expect(got!.structured).toEqual(STRUCTURED)
  })

  it('updateBrew throws when the record does not exist', async () => {
    await expect(
      updateBrew('nope', { user_edits: { grind: 'x' } }),
    ).rejects.toThrow('Brew nope not found')
  })

  it('deleteBrew removes a single entry', async () => {
    await addBrew(mkBrew({ id: 'b3' }))
    await deleteBrew('b3')
    expect(await getBrew('b3')).toBeNull()
  })

  it('deleteBrewsForCoffee removes one coffee brews and none of another', async () => {
    await addBrew(mkBrew({ id: 'a1', coffee_id: 'cA' }))
    await addBrew(mkBrew({ id: 'a2', coffee_id: 'cA' }))
    await addBrew(mkBrew({ id: 'b1', coffee_id: 'cB' }))
    await deleteBrewsForCoffee('cA')
    expect(await listBrewsForCoffee('cA')).toEqual([])
    expect((await listBrewsForCoffee('cB')).map(b => b.id)).toEqual(['b1'])
  })

  it('effectiveBrew honors an explicit null edit', () => {
    const b = mkBrew({ user_edits: { water_temp_c: null } })
    expect(effectiveBrew(b).water_temp_c).toBeNull()
    // unedited field falls through to structured
    expect(effectiveBrew(b).brew_method).toBe('V60')
  })

  it('effectiveBrew applies a value edit over structured', () => {
    const b = mkBrew({ user_edits: { grind: 'coarse' } })
    expect(effectiveBrew(b).grind).toBe('coarse')
  })
})
