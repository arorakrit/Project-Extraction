import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  StructuredBrewSchema,
  isEmptyBrew,
  type StructuredBrew,
} from '@/ai/schemas/brew'

const FULL: StructuredBrew = {
  brew_method: 'V60',
  dose_g: 18,
  water_g: 300,
  ratio: null,
  grind: 'medium-fine',
  water_temp_c: 94,
  total_time_s: 150,
  tasting_note: 'bright and floral with a lemon finish',
}

const ALL_NULL: StructuredBrew = {
  brew_method: null,
  dose_g: null,
  water_g: null,
  ratio: null,
  grind: null,
  water_temp_c: null,
  total_time_s: null,
  tasting_note: null,
}

describe('StructuredBrewSchema', () => {
  it('accepts a fully-populated brew', () => {
    expect(StructuredBrewSchema.parse(FULL)).toEqual(FULL)
  })

  it('accepts an all-null brew', () => {
    expect(StructuredBrewSchema.parse(ALL_NULL)).toEqual(ALL_NULL)
  })

  it('rejects a wrong-typed field (string dose_g)', () => {
    const bad = { ...FULL, dose_g: '18' }
    expect(StructuredBrewSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a non-integer total_time_s', () => {
    const bad = { ...FULL, total_time_s: 150.5 }
    expect(StructuredBrewSchema.safeParse(bad).success).toBe(false)
  })
})

describe('isEmptyBrew', () => {
  it('is true only for the all-null case', () => {
    expect(isEmptyBrew(ALL_NULL)).toBe(true)
  })

  it('is false when any field is set', () => {
    expect(isEmptyBrew(FULL)).toBe(false)
  })

  it('is false for a tasting-note-only brew', () => {
    expect(isEmptyBrew({ ...ALL_NULL, tasting_note: 'so juicy' })).toBe(false)
  })
})

const FIXTURES_DIR = join(process.cwd(), 'tests/ai-fixtures/brew-structuring')

interface BrewFixture {
  name: string
  recorded: { content: Array<{ type: string; name?: string; input?: unknown }> }
  expected: unknown
}

function loadBrewFixtures(): BrewFixture[] {
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

describe('brew-structuring golden fixtures', () => {
  const fixtures = loadBrewFixtures()

  if (fixtures.length === 0) {
    it.skip('no fixtures present — add one under tests/ai-fixtures/brew-structuring/<name>/', () => {})
    return
  }

  it.each(fixtures)(
    '$name: recorded response validates and equals expected output',
    ({ recorded, expected }) => {
      const toolUse = recorded.content.find(
        b => b.type === 'tool_use' && b.name === 'record_brew_log',
      )
      expect(toolUse, 'recorded-response.json must contain a tool_use block').toBeDefined()
      const parsed = StructuredBrewSchema.parse(toolUse!.input)
      expect(parsed).toEqual(expected)
    },
  )
})
