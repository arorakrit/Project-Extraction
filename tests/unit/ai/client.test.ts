import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import {
  callClaudeTool,
  ClaudeNetworkError,
  ClaudeSchemaError,
  MissingApiKeyError,
} from '@/ai/client'
import { __resetForTests as resetTelemetry, getSession } from '@/lib/telemetry'
import { getDB } from '@/store/db'
import { clearApiKey, setApiKey } from '@/store/settings'

const TestSchema = z.object({ ok: z.boolean() })

const validResponse = {
  content: [
    { type: 'tool_use', name: 'record_coffee_label', input: { ok: true } },
  ],
  usage: { output_tokens: 5 },
}

const invalidResponse = {
  content: [
    {
      type: 'tool_use',
      name: 'record_coffee_label',
      input: { ok: 'not_a_boolean' },
    },
  ],
  usage: { output_tokens: 5 },
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

async function invoke(): Promise<unknown> {
  return callClaudeTool({
    call: 'extract_coffee_label',
    tool: 'record_coffee_label',
    toolDescription: 'test',
    schema: TestSchema,
    messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    inputImageBytes: 100,
    inputTextChars: null,
  })
}

describe('callClaudeTool', () => {
  beforeEach(async () => {
    resetTelemetry()
    const db = await getDB()
    await db.clear('settings')
    await db.clear('coffees')
    await setApiKey('sk-test')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
  })

  function sentApiKey(fetchMock: { mock: { calls: unknown[][] } }): unknown {
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    return (init?.headers as Record<string, string> | undefined)?.['x-api-key']
  }

  it('returns parsed result on first-attempt success', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(validResponse))

    const result = await invoke()

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const session = getSession()
    expect(session).toHaveLength(1)
    expect(session[0]?.status).toBe('ok')
    expect(session[0]?.retried).toBe(false)
    expect(session[0]?.output_tokens).toBe(5)
    expect(session[0]?.input_image_bytes).toBe(100)
  })

  it('retries exactly once on schema failure and succeeds the second time', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(invalidResponse))
      .mockResolvedValueOnce(jsonResponse(validResponse))

    const result = await invoke()

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const session = getSession()
    expect(session).toHaveLength(1)
    expect(session[0]?.status).toBe('retry_then_ok')
    expect(session[0]?.retried).toBe(true)
  })

  it('throws ClaudeSchemaError after two consecutive schema failures', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(invalidResponse))
      .mockResolvedValueOnce(jsonResponse(invalidResponse))

    await expect(invoke()).rejects.toBeInstanceOf(ClaudeSchemaError)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const session = getSession()
    expect(session).toHaveLength(1)
    expect(session[0]?.status).toBe('schema_error')
    expect(session[0]?.retried).toBe(true)
  })

  it('does not retry on HTTP 5xx error', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse({ error: 'boom' }, 500))

    await expect(invoke()).rejects.toBeInstanceOf(ClaudeNetworkError)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const session = getSession()
    expect(session).toHaveLength(1)
    expect(session[0]?.status).toBe('network_error')
    expect(session[0]?.retried).toBe(false)
  })

  it('throws MissingApiKeyError when no key is configured', async () => {
    await clearApiKey()
    await expect(invoke()).rejects.toBeInstanceOf(MissingApiKeyError)
  })

  // --- 005-build-time-api-key: key source resolution -----------------------

  it('uses the built-in key when no personal key is saved (US1)', async () => {
    await clearApiKey()
    vi.stubEnv('VITE_ANTHROPIC_KEY', 'sk-ant-built')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(validResponse))

    const result = await invoke()

    expect(result).toEqual({ ok: true })
    expect(sentApiKey(fetchMock)).toBe('sk-ant-built')
  })

  it('marks failures of the built-in key with keySource built-in (US1, FR-008)', async () => {
    await clearApiKey()
    vi.stubEnv('VITE_ANTHROPIC_KEY', 'sk-ant-built')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({ error: 'unauthorized' }, 401),
    )

    const err = await invoke().catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ClaudeNetworkError)
    expect((err as ClaudeNetworkError).status).toBe(401)
    expect((err as ClaudeNetworkError).keySource).toBe('built-in')
  })

  it('personal key wins over the built-in key (US2, FR-003)', async () => {
    // beforeEach saved the personal key 'sk-test'
    vi.stubEnv('VITE_ANTHROPIC_KEY', 'sk-ant-built')
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(validResponse))

    await invoke()

    expect(sentApiKey(fetchMock)).toBe('sk-test')
  })

  it('an invalid personal key fails as personal — no silent fallback (US2)', async () => {
    vi.stubEnv('VITE_ANTHROPIC_KEY', 'sk-ant-built')
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      jsonResponse({ error: 'unauthorized' }, 401),
    )

    const err = await invoke().catch((e: unknown) => e)

    expect(err).toBeInstanceOf(ClaudeNetworkError)
    expect((err as ClaudeNetworkError).keySource).toBe('personal')
  })

  it('throws MissingApiKeyError when the built-in key is blank (US3, FR-009)', async () => {
    await clearApiKey()
    vi.stubEnv('VITE_ANTHROPIC_KEY', '   ')
    await expect(invoke()).rejects.toBeInstanceOf(MissingApiKeyError)
  })
})
