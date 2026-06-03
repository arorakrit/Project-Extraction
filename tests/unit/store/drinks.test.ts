import { beforeEach, describe, expect, it } from 'vitest'
import {
  addDrink,
  deleteDrink,
  getDrink,
  listDrinks,
  listVenues,
  makeDrinkLog,
  StaleDrinkSchemaError,
  type DrinkLog,
} from '@/store/drinks'
import { getDB } from '@/store/db'

async function clearDrinks(): Promise<void> {
  const db = await getDB()
  await db.clear('drinks')
}

describe('makeDrinkLog (validation & normalization)', () => {
  it('C-01: builds a valid log from a rating-only input', () => {
    const log = makeDrinkLog({ rating: 4 })
    expect(log.rating).toBe(4)
    expect(log.flavour_tags).toEqual([])
    expect(log.coffee_name).toBeNull()
    expect(log.venue).toBeNull()
    expect(log.origin_country).toBeNull()
    expect(log.process).toBeNull()
    expect(log.roast_level).toBeNull()
    expect(log.schema_version).toBe(1)
    expect(log.id).toMatch(/[0-9a-f-]{36}/)
    expect(() => new Date(log.logged_at).toISOString()).not.toThrow()
  })

  it('C-02: throws on out-of-range or non-integer ratings', () => {
    expect(() => makeDrinkLog({ rating: 0 })).toThrow()
    expect(() => makeDrinkLog({ rating: 6 })).toThrow()
    expect(() => makeDrinkLog({ rating: 3.5 })).toThrow()
    expect(() => makeDrinkLog({ rating: Number.NaN })).toThrow()
  })

  it('C-03: throws on too many / duplicate / off-palette flavour tags', () => {
    expect(() =>
      makeDrinkLog({
        rating: 3,
        flavour_tags: ['fruity', 'floral', 'nutty', 'heavy'],
      }),
    ).toThrow()
    expect(() =>
      makeDrinkLog({ rating: 3, flavour_tags: ['fruity', 'fruity'] }),
    ).toThrow()
    expect(() =>
      // @ts-expect-error — exercising the runtime guard with a bad value
      makeDrinkLog({ rating: 3, flavour_tags: ['smoky'] }),
    ).toThrow()
  })

  it('C-04: trims strings and maps empty to null; clamps overly long input', () => {
    const log = makeDrinkLog({
      rating: 5,
      venue: '  WoC Brussels  ',
      coffee_name: '   ',
      origin_country: 'Ethiopia',
    })
    expect(log.venue).toBe('WoC Brussels')
    expect(log.coffee_name).toBeNull()
    expect(log.origin_country).toBe('Ethiopia')

    const long = 'x'.repeat(500)
    expect(makeDrinkLog({ rating: 5, venue: long }).venue!.length).toBe(120)
  })

  it('throws on an unrecognized process or roast level', () => {
    // @ts-expect-error — runtime guard
    expect(() => makeDrinkLog({ rating: 3, process: 'anaerobic' })).toThrow()
    // @ts-expect-error — runtime guard
    expect(() => makeDrinkLog({ rating: 3, roast_level: 'charcoal' })).toThrow()
  })
})

describe('drinks store (CRUD)', () => {
  beforeEach(clearDrinks)

  it('addDrink → getDrink round-trips', async () => {
    const log = makeDrinkLog({ rating: 4, venue: 'Cafe A' })
    await addDrink(log)
    expect(await getDrink(log.id)).toEqual(log)
  })

  it('getDrink returns null for a missing id', async () => {
    expect(await getDrink('nope')).toBeNull()
  })

  it('addDrink rejects a non-1 schema_version', async () => {
    const bad = { ...makeDrinkLog({ rating: 3 }), schema_version: 9 as unknown as 1 }
    await expect(addDrink(bad)).rejects.toThrow('Refusing to write')
  })

  it('C-05: listDrinks returns entries newest-first', async () => {
    const older: DrinkLog = {
      ...makeDrinkLog({ rating: 2 }),
      logged_at: '2026-06-01T10:00:00.000Z',
    }
    const newer: DrinkLog = {
      ...makeDrinkLog({ rating: 5 }),
      logged_at: '2026-06-03T10:00:00.000Z',
    }
    await addDrink(older)
    await addDrink(newer)
    const list = await listDrinks()
    expect(list.map(d => d.id)).toEqual([newer.id, older.id])
  })

  it('C-07: deleteDrink removes only the targeted record', async () => {
    const a = makeDrinkLog({ rating: 3 })
    const b = makeDrinkLog({ rating: 4 })
    await addDrink(a)
    await addDrink(b)
    await deleteDrink(a.id)
    expect(await getDrink(a.id)).toBeNull()
    expect(await getDrink(b.id)).not.toBeNull()
  })

  it('C-08: unknown schema_version throws on read and is filtered from listDrinks', async () => {
    const db = await getDB()
    const stale = {
      ...makeDrinkLog({ rating: 3 }),
      id: 'stale-1',
      schema_version: 2,
    } as unknown as DrinkLog
    await db.put('drinks', stale)
    await expect(getDrink('stale-1')).rejects.toBeInstanceOf(StaleDrinkSchemaError)
    expect(await listDrinks()).toEqual([])
  })

  it('C-09: the DB exposes the drinks store alongside coffees/brews/settings', async () => {
    const db = await getDB()
    expect(db.version).toBe(3)
    expect(Array.from(db.objectStoreNames).sort()).toEqual([
      'brews',
      'coffees',
      'drinks',
      'settings',
    ])
  })
})

describe('listVenues (C-06)', () => {
  beforeEach(clearDrinks)

  it('returns distinct, case-insensitive, non-null venues newest-first', async () => {
    await addDrink({
      ...makeDrinkLog({ rating: 3, venue: 'Cafe A' }),
      logged_at: '2026-06-01T10:00:00.000Z',
    })
    await addDrink({
      ...makeDrinkLog({ rating: 4 }), // null venue — excluded
      logged_at: '2026-06-02T10:00:00.000Z',
    })
    await addDrink({
      ...makeDrinkLog({ rating: 5, venue: 'cafe a' }), // dup (case)
      logged_at: '2026-06-03T10:00:00.000Z',
    })
    await addDrink({
      ...makeDrinkLog({ rating: 2, venue: 'WoC Brussels' }),
      logged_at: '2026-06-04T10:00:00.000Z',
    })

    const venues = await listVenues()
    // newest-first; 'cafe a' is the first-seen casing when walking newest→oldest
    expect(venues).toEqual(['WoC Brussels', 'cafe a'])
  })

  it('surfaces a newly logged venue on the next call', async () => {
    expect(await listVenues()).toEqual([])
    await addDrink(makeDrinkLog({ rating: 4, venue: 'New Stand' }))
    expect(await listVenues()).toContain('New Stand')
  })
})
