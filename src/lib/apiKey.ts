import { getApiKey } from '@/store/settings'

export type KeySource = 'personal' | 'built-in' | 'none'

export interface KeyResolution {
  source: KeySource
  /** The credential to attach to the Claude call. null ⇔ source === 'none'. */
  key: string | null
}

/**
 * Trimmed VITE_ANTHROPIC_KEY from the build env, or null when unset, empty,
 * or whitespace-only (FR-009: a blank value degrades to the no-key path).
 *
 * Read at call time — never hoisted to module scope — so vi.stubEnv works in
 * tests and the value can't be frozen by import order. Per the 005 contract,
 * this module is the ONLY reader of import.meta.env.VITE_ANTHROPIC_KEY.
 */
export function getBuiltInApiKey(): string | null {
  const trimmed = import.meta.env.VITE_ANTHROPIC_KEY?.trim()
  return trimmed ? trimmed : null
}

/**
 * Resolve the credential for a Claude call. Fixed precedence (005 contract):
 * personal (settings store) → built-in (build env) → none. A saved personal
 * key always wins — even an invalid one — so a user's mistake is surfaced
 * rather than silently masked by the built-in key.
 */
export async function resolveApiKey(): Promise<KeyResolution> {
  const personal = await getApiKey()
  if (personal) return { source: 'personal', key: personal }

  const builtIn = getBuiltInApiKey()
  if (builtIn) return { source: 'built-in', key: builtIn }

  return { source: 'none', key: null }
}
