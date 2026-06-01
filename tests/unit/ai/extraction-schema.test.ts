import { describe, expect, it } from 'vitest'
import {
  ExtractedCoffeeSchema,
  isEmptyExtraction,
} from '@/ai/schemas/extraction'

const baseEmpty = {
  roaster_name: null,
  coffee_name: null,
  origin_country: null,
  origin_region: null,
  variety: null,
  process: null,
  roast_level: null,
  tasting_notes: [],
}

describe('ExtractedCoffeeSchema', () => {
  it('accepts a fully populated extraction', () => {
    const input = {
      roaster_name: 'Onyx Coffee Lab',
      coffee_name: 'Geisha',
      origin_country: 'Panama',
      origin_region: 'Boquete',
      variety: 'Geisha',
      process: 'Washed',
      roast_level: 'Light',
      tasting_notes: ['jasmine', 'bergamot', 'peach'],
    }
    expect(ExtractedCoffeeSchema.parse(input)).toEqual(input)
  })

  it('accepts every scalar null and empty tasting_notes', () => {
    expect(ExtractedCoffeeSchema.parse(baseEmpty)).toEqual(baseEmpty)
  })

  it('accepts a partial extraction (some null, some populated)', () => {
    const input = {
      ...baseEmpty,
      roaster_name: 'Heart Coffee',
      origin_country: 'Ethiopia',
      process: 'Natural',
      tasting_notes: ['blueberry'],
    }
    expect(ExtractedCoffeeSchema.parse(input)).toEqual(input)
  })

  it('rejects missing required fields', () => {
    expect(() => ExtractedCoffeeSchema.parse({ roaster_name: 'X' })).toThrow()
  })

  it('rejects wrong scalar type (number where string|null expected)', () => {
    expect(() =>
      ExtractedCoffeeSchema.parse({ ...baseEmpty, roaster_name: 123 }),
    ).toThrow()
  })

  it('rejects tasting_notes containing non-string', () => {
    expect(() =>
      ExtractedCoffeeSchema.parse({
        ...baseEmpty,
        tasting_notes: ['ok', 42],
      }),
    ).toThrow()
  })

  it('rejects tasting_notes as null (it MUST be an array, possibly empty)', () => {
    expect(() =>
      ExtractedCoffeeSchema.parse({ ...baseEmpty, tasting_notes: null }),
    ).toThrow()
  })

  it('rejects extra unknown fields gracefully (strips them per Zod default)', () => {
    const result = ExtractedCoffeeSchema.parse({
      ...baseEmpty,
      stray_field: 'ignored',
    })
    expect(result).toEqual(baseEmpty)
    expect('stray_field' in result).toBe(false)
  })
})

describe('isEmptyExtraction', () => {
  it('returns true for the all-null + empty-notes case', () => {
    expect(isEmptyExtraction(baseEmpty)).toBe(true)
  })

  it('returns false when any scalar is populated', () => {
    expect(isEmptyExtraction({ ...baseEmpty, roaster_name: 'X' })).toBe(false)
    expect(isEmptyExtraction({ ...baseEmpty, coffee_name: 'X' })).toBe(false)
    expect(isEmptyExtraction({ ...baseEmpty, origin_country: 'X' })).toBe(false)
    expect(isEmptyExtraction({ ...baseEmpty, origin_region: 'X' })).toBe(false)
    expect(isEmptyExtraction({ ...baseEmpty, variety: 'X' })).toBe(false)
    expect(isEmptyExtraction({ ...baseEmpty, process: 'X' })).toBe(false)
    expect(isEmptyExtraction({ ...baseEmpty, roast_level: 'X' })).toBe(false)
  })

  it('returns false when only tasting_notes is non-empty', () => {
    expect(
      isEmptyExtraction({ ...baseEmpty, tasting_notes: ['blueberry'] }),
    ).toBe(false)
  })
})
