import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  VoiceDrinkDraftSchema,
  isEmptyDrinkDraft,
  normalizeDrinkDraft,
  type VoiceDrinkDraft,
} from '@/ai/schemas/drink'

const FULL: VoiceDrinkDraft = {
  venue: "Sunday's Coffee",
  coffee_name: 'oat flat white',
  rating: 4,
  flavour_tags: ['fruity', 'bright'],
}

const EMPTY: VoiceDrinkDraft = {
  venue: null,
  coffee_name: null,
  rating: null,
  flavour_tags: [],
}

describe('VoiceDrinkDraftSchema', () => {
  it('accepts a fully-populated draft', () => {
    expect(VoiceDrinkDraftSchema.parse(FULL)).toEqual(FULL)
  })

  it('accepts an all-null draft', () => {
    expect(VoiceDrinkDraftSchema.parse(EMPTY)).toEqual(EMPTY)
  })

  it('rejects out-of-range and non-integer ratings', () => {
    expect(VoiceDrinkDraftSchema.safeParse({ ...FULL, rating: 0 }).success).toBe(false)
    expect(VoiceDrinkDraftSchema.safeParse({ ...FULL, rating: 6 }).success).toBe(false)
    expect(VoiceDrinkDraftSchema.safeParse({ ...FULL, rating: 3.5 }).success).toBe(false)
  })

  it('rejects off-palette flavour tags (closed enum — FR-011)', () => {
    const bad = { ...FULL, flavour_tags: ['fruity', 'jammy'] }
    expect(VoiceDrinkDraftSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a missing field (no defaults — schema is exact)', () => {
    const missing: Partial<VoiceDrinkDraft> = { ...FULL }
    delete missing.venue
    expect(VoiceDrinkDraftSchema.safeParse(missing).success).toBe(false)
  })
})

describe('normalizeDrinkDraft', () => {
  it('dedupes tags preserving order of mention', () => {
    const draft = { ...FULL, flavour_tags: ['fruity', 'bright', 'fruity'] as const }
    expect(normalizeDrinkDraft({ ...draft, flavour_tags: [...draft.flavour_tags] }).flavour_tags).toEqual([
      'fruity',
      'bright',
    ])
  })

  it('caps at the first three distinct tags (FR-011)', () => {
    const draft: VoiceDrinkDraft = {
      ...FULL,
      flavour_tags: ['heavy', 'nutty', 'floral', 'fruity', 'bright'],
    }
    expect(normalizeDrinkDraft(draft).flavour_tags).toEqual([
      'heavy',
      'nutty',
      'floral',
    ])
  })

  it('is removal-only: never touches the other fields', () => {
    const out = normalizeDrinkDraft(FULL)
    expect(out.venue).toBe(FULL.venue)
    expect(out.coffee_name).toBe(FULL.coffee_name)
    expect(out.rating).toBe(FULL.rating)
  })

  it('leaves an already-valid tag list unchanged', () => {
    expect(normalizeDrinkDraft(FULL).flavour_tags).toEqual(['fruity', 'bright'])
  })
})

describe('isEmptyDrinkDraft', () => {
  it('is true only when nothing usable was heard', () => {
    expect(isEmptyDrinkDraft(EMPTY)).toBe(true)
  })

  it('is false when any single field is present', () => {
    expect(isEmptyDrinkDraft({ ...EMPTY, venue: 'Blue Bottle' })).toBe(false)
    expect(isEmptyDrinkDraft({ ...EMPTY, coffee_name: 'cortado' })).toBe(false)
    expect(isEmptyDrinkDraft({ ...EMPTY, rating: 3 })).toBe(false)
    expect(isEmptyDrinkDraft({ ...EMPTY, flavour_tags: ['nutty'] })).toBe(false)
  })
})

const FIXTURES_DIR = join(process.cwd(), 'tests/ai-fixtures/drink-structuring')

interface DrinkFixture {
  name: string
  recorded: { content: Array<{ type: string; name?: string; input?: unknown }> }
  expected: unknown
}

function loadDrinkFixtures(): DrinkFixture[] {
  const entries = readdirSync(FIXTURES_DIR).filter(name => {
    try {
      return statSync(join(FIXTURES_DIR, name)).isDirectory()
    } catch {
      return false
    }
  })
  return entries.map(name => ({
    name,
    recorded: JSON.parse(
      readFileSync(join(FIXTURES_DIR, name, 'recorded-response.json'), 'utf8'),
    ),
    expected: JSON.parse(
      readFileSync(join(FIXTURES_DIR, name, 'expected-output.json'), 'utf8'),
    ),
  }))
}

describe('drink-structuring golden fixtures', () => {
  const fixtures = loadDrinkFixtures()

  if (fixtures.length === 0) {
    it.skip('no fixtures present — add one under tests/ai-fixtures/drink-structuring/<name>/', () => {})
    return
  }

  it.each(fixtures)(
    '$name: recorded response validates, normalizes, and equals expected output',
    ({ recorded, expected }) => {
      const toolUse = recorded.content.find(
        b => b.type === 'tool_use' && b.name === 'record_drink_log',
      )
      expect(toolUse, 'recorded-response.json must contain a tool_use block').toBeDefined()
      const parsed = VoiceDrinkDraftSchema.parse(toolUse!.input)
      expect(normalizeDrinkDraft(parsed)).toEqual(expected)
    },
  )
})
