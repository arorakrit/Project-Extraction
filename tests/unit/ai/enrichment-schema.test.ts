import { describe, expect, it } from 'vitest'
import { EnrichedCoffeeSchema } from '@/ai/schemas/enrichment'

describe('EnrichedCoffeeSchema', () => {
  it('accepts a fully populated enrichment', () => {
    const input = {
      origin_story: 'A short story about Yirgacheffe.',
      producer_context: 'About the producer.',
      brew_recommendation: {
        method: 'V60',
        ratio: '1:16',
        grind: 'medium-fine',
        temperature_c: 93,
        notes: 'Pre-wet, then pulse.',
      },
    }
    expect(EnrichedCoffeeSchema.parse(input)).toEqual(input)
  })

  it('accepts every top-level field null (no fabrication path)', () => {
    const input = {
      origin_story: null,
      producer_context: null,
      brew_recommendation: null,
    }
    expect(EnrichedCoffeeSchema.parse(input)).toEqual(input)
  })

  it('accepts brew_recommendation null with stories populated', () => {
    const input = {
      origin_story: 'A story.',
      producer_context: 'Producer.',
      brew_recommendation: null,
    }
    expect(EnrichedCoffeeSchema.parse(input)).toEqual(input)
  })

  it('accepts brew_recommendation with nullable temperature_c and notes', () => {
    const input = {
      origin_story: null,
      producer_context: null,
      brew_recommendation: {
        method: 'V60',
        ratio: '1:16',
        grind: 'medium-fine',
        temperature_c: null,
        notes: null,
      },
    }
    expect(EnrichedCoffeeSchema.parse(input)).toEqual(input)
  })

  it('rejects brew_recommendation missing required string fields', () => {
    expect(() =>
      EnrichedCoffeeSchema.parse({
        origin_story: null,
        producer_context: null,
        brew_recommendation: {
          method: 'V60',
          ratio: '1:16',
          // missing grind
          temperature_c: null,
          notes: null,
        },
      }),
    ).toThrow()
  })

  it('rejects non-integer temperature_c', () => {
    expect(() =>
      EnrichedCoffeeSchema.parse({
        origin_story: null,
        producer_context: null,
        brew_recommendation: {
          method: 'V60',
          ratio: '1:16',
          grind: 'medium-fine',
          temperature_c: 93.5,
          notes: null,
        },
      }),
    ).toThrow()
  })

  it('rejects missing top-level fields', () => {
    expect(() => EnrichedCoffeeSchema.parse({ origin_story: null })).toThrow()
  })

  it('rejects extra unknown fields gracefully (strips per Zod default)', () => {
    const result = EnrichedCoffeeSchema.parse({
      origin_story: null,
      producer_context: null,
      brew_recommendation: null,
      stray_field: 'ignored',
    })
    expect('stray_field' in result).toBe(false)
  })
})
