import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getBuiltInApiKey, resolveApiKey } from '@/lib/apiKey'
import { getDB } from '@/store/db'
import { setApiKey } from '@/store/settings'

// Contract: specs/005-build-time-api-key/contracts/key-resolution.md §2
// (behaviour table). Personal key via fake-indexeddb; built-in via stubEnv.

describe('getBuiltInApiKey', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('returns the trimmed env value when set', () => {
    vi.stubEnv('VITE_ANTHROPIC_KEY', '  sk-ant-built  ')
    expect(getBuiltInApiKey()).toBe('sk-ant-built')
  })

  it('returns null when no built-in key is configured (test env baseline)', () => {
    // vite.config.ts blanks VITE_ANTHROPIC_KEY for the test run; blank ≡
    // absent per FR-009, so this covers the unset path deterministically.
    expect(getBuiltInApiKey()).toBeNull()
  })

  it.each([['empty', ''], ['whitespace-only', '   ']])(
    'treats a %s value as absent (FR-009)',
    (_label, value) => {
      vi.stubEnv('VITE_ANTHROPIC_KEY', value)
      expect(getBuiltInApiKey()).toBeNull()
    },
  )
})

describe('resolveApiKey', () => {
  beforeEach(async () => {
    const db = await getDB()
    await db.clear('settings')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('personal wins when both a personal and a built-in key exist', async () => {
    await setApiKey('sk-ant-personal')
    vi.stubEnv('VITE_ANTHROPIC_KEY', 'sk-ant-built')

    await expect(resolveApiKey()).resolves.toEqual({
      source: 'personal',
      key: 'sk-ant-personal',
    })
  })

  it('resolves personal when no built-in key is configured', async () => {
    await setApiKey('sk-ant-personal')

    await expect(resolveApiKey()).resolves.toEqual({
      source: 'personal',
      key: 'sk-ant-personal',
    })
  })

  it('falls back to the built-in key when no personal key is saved', async () => {
    vi.stubEnv('VITE_ANTHROPIC_KEY', 'sk-ant-built')

    await expect(resolveApiKey()).resolves.toEqual({
      source: 'built-in',
      key: 'sk-ant-built',
    })
  })

  it('resolves none when neither key exists', async () => {
    await expect(resolveApiKey()).resolves.toEqual({
      source: 'none',
      key: null,
    })
  })

  it('resolves none when the built-in key is blank (FR-009)', async () => {
    vi.stubEnv('VITE_ANTHROPIC_KEY', '   ')

    await expect(resolveApiKey()).resolves.toEqual({
      source: 'none',
      key: null,
    })
  })
})
