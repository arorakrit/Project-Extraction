import { useEffect, useState, type FormEvent } from 'react'
import { clearApiKey, getApiKey, setApiKey } from '@/store/settings'
import { aggregateTokens, getSession } from '@/lib/telemetry'

interface SettingsProps {
  onSaved?: () => void
}

export function Settings({ onSaved }: SettingsProps) {
  const [key, setKey] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hasKey, setHasKey] = useState(false)
  const [aggregate, setAggregate] = useState(aggregateTokens())

  useEffect(() => {
    void getApiKey().then(k => setHasKey(!!k))
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setAggregate(aggregateTokens()), 1000)
    return () => clearInterval(interval)
  }, [])

  async function handleSave(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault()
    const trimmed = key.trim()
    if (!trimmed) return
    setStatus('saving')
    await setApiKey(trimmed)
    setHasKey(true)
    setKey('')
    setStatus('saved')
    onSaved?.()
  }

  async function handleClear(): Promise<void> {
    await clearApiKey()
    setHasKey(false)
    setStatus('idle')
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 430, margin: '0 auto' }}>
      <h1 style={{ fontSize: 'var(--font-size-xl)', margin: '0 0 var(--space-4)' }}>
        Settings
      </h1>

      <form onSubmit={handleSave}>
        <label
          htmlFor="anthropic-key"
          style={{
            display: 'block',
            marginBottom: 'var(--space-2)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Anthropic API key
          {hasKey && (
            <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-text-tertiary)' }}>
              (saved — paste again to overwrite)
            </span>
          )}
        </label>
        <input
          id="anthropic-key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-..."
          value={key}
          onChange={e => setKey(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
          <button
            type="submit"
            className="primary"
            disabled={!key.trim() || status === 'saving'}
          >
            {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save'}
          </button>
          {hasKey && (
            <button type="button" onClick={handleClear}>
              Clear
            </button>
          )}
        </div>
      </form>

      <p
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          marginTop: 'var(--space-6)',
        }}
      >
        Your key is stored locally on this device only and sent directly to
        api.anthropic.com on each request. Get a key at console.anthropic.com.
      </p>

      {import.meta.env.DEV && (
        <details style={{ marginTop: 'var(--space-8)' }}>
          <summary
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
          >
            Dev: session usage
          </summary>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              margin: 'var(--space-2) 0',
            }}
          >
            Calls: {aggregate.calls} · Output tokens: {aggregate.output_tokens} ·
            Image bytes sent: {aggregate.input_image_bytes}
          </p>
          <p
            style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-tertiary)',
            }}
          >
            Last {getSession().length} entries via{' '}
            <code>window.__telemetry.session()</code>.
          </p>
        </details>
      )}
    </div>
  )
}
