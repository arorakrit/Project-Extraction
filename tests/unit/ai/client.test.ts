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
  })

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
})
