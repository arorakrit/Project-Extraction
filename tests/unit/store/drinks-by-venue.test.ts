import { beforeEach, describe, expect, it } from 'vitest'
import {
  addDrink,
  listDrinksByVenue,
  makeDrinkLog,
  resolveVenueCasing,
  type DrinkInput,
} from '@/store/drinks'
import { getDB } from '@/store/db'

async function clearDrinks(): Promise<void> {
  const db = await getDB()
  await db.clear('drinks')
}

/** Seed one drink with a deterministic logged_at so ordering is testable. */
async function seed(input: DrinkInput, loggedAt: string): Promise<void> {
  const log = { ...makeDrinkLog(input), logged_at: loggedAt }
  await addDrink(log)
}

describe('listDrinksByVenue', () => {
  beforeEach(clearDrinks)

  it('V-01: matches venues case-insensitively and ignores surrounding whitespace', async () => {
    await seed({ rating: 4, venue: 'Blue Bottle' }, '2026-06-10T10:00:00.000Z')
    await seed({ rating: 3, venue: 'Sunday’s Coffee' }, '2026-06-10T11:00:00.000Z')

    const hits = await listDrinksByVenue('  blue bottle ')
    expect(hits).toHaveLength(1)
    expect(hits[0]?.venue).toBe('Blue Bottle')
  })

  it('V-02: returns all and only that venue’s drinks, newest first', async () => {
    await seed({ rating: 2, venue: 'WoC Brussels' }, '2026-06-08T09:00:00.000Z')
    await seed({ rating: 5, venue: 'Blue Bottle' }, '2026-06-09T09:00:00.000Z')
    await seed({ rating: 4, venue: 'WoC Brussels' }, '2026-06-10T09:00:00.000Z')

    const hits = await listDrinksByVenue('WoC Brussels')
    expect(hits.map(d => d.rating)).toEqual([4, 2]) // newest first
    expect(hits.every(d => d.venue === 'WoC Brussels')).toBe(true)
  })

  it('V-03: null returns the No-café bucket (venue-less drinks only), newest first', async () => {
    await seed({ rating: 1 }, '2026-06-08T09:00:00.000Z')
    await seed({ rating: 5, venue: 'Blue Bottle' }, '2026-06-09T09:00:00.000Z')
    await seed({ rating: 3 }, '2026-06-10T09:00:00.000Z')

    const bucket = await listDrinksByVenue(null)
    expect(bucket.map(d => d.rating)).toEqual([3, 1])
    expect(bucket.every(d => d.venue === null)).toBe(true)
  })

  it('V-04: unknown venue returns an empty list', async () => {
    await seed({ rating: 4, venue: 'Blue Bottle' }, '2026-06-10T10:00:00.000Z')
    expect(await listDrinksByVenue('Nowhere Café')).toEqual([])
  })
})

describe('resolveVenueCasing', () => {
  beforeEach(clearDrinks)

  it('V-05: adopts the stored casing on a case-insensitive trimmed match', async () => {
    await seed({ rating: 4, venue: 'Blue Bottle' }, '2026-06-10T10:00:00.000Z')
    expect(await resolveVenueCasing('  BLUE bottle ')).toBe('Blue Bottle')
  })

  it('V-06: keeps an unmatched venue verbatim (trimmed) — like a free-typed new café', async () => {
    await seed({ rating: 4, venue: 'Blue Bottle' }, '2026-06-10T10:00:00.000Z')
    expect(await resolveVenueCasing('  Kettle & Co  ')).toBe('Kettle & Co')
  })

  it('V-07: works against an empty history (no venues yet)', async () => {
    expect(await resolveVenueCasing('First Café')).toBe('First Café')
  })
})
