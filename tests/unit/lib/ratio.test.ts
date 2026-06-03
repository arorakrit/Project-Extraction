import { describe, expect, it } from 'vitest'
import { deriveRatio } from '@/lib/ratio'

describe('deriveRatio', () => {
  it('18 g / 300 g → 16.7', () => {
    expect(deriveRatio(18, 300)).toBe(16.7)
  })

  it('15 g / 240 g → 16', () => {
    expect(deriveRatio(15, 240)).toBe(16)
  })

  it('null when dose missing', () => {
    expect(deriveRatio(null, 300)).toBeNull()
  })

  it('null when water missing', () => {
    expect(deriveRatio(18, null)).toBeNull()
  })

  it('null when dose is zero', () => {
    expect(deriveRatio(0, 300)).toBeNull()
  })

  it('null when dose is negative', () => {
    expect(deriveRatio(-1, 300)).toBeNull()
  })
})
