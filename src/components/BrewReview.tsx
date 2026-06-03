import { useState } from 'react'
import { BrewFields } from '@/components/BrewFields'
import { addBrew, brewEditsFrom, type BrewLogEntry } from '@/store/brews'
import type { StructuredBrew } from '@/ai/schemas/brew'

interface BrewReviewProps {
  coffeeId: string
  structured: StructuredBrew
  transcript: string | null
  onSaved: () => void
  onCancel: () => void
}

export function BrewReview({
  coffeeId,
  structured,
  transcript,
  onSaved,
  onCancel,
}: BrewReviewProps) {
  const [draft, setDraft] = useState<StructuredBrew>(structured)
  const [saving, setSaving] = useState(false)

  async function handleSave(): Promise<void> {
    setSaving(true)
    const entry: BrewLogEntry = {
      id: crypto.randomUUID(),
      coffee_id: coffeeId,
      logged_at: new Date().toISOString(),
      source: 'voice',
      transcript,
      structured,
      user_edits: brewEditsFrom(structured, draft),
      schema_version: 1,
    }
    try {
      await addBrew(entry)
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 430, margin: '0 auto' }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', margin: '0 0 var(--space-4)' }}>
        Review brew
      </h2>

      <BrewFields value={draft} onChange={setDraft} />

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
        <button type="button" onClick={onCancel} style={{ flex: 1 }} disabled={saving}>
          Cancel
        </button>
        <button
          type="button"
          className="primary"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ flex: 1 }}
        >
          {saving ? 'Saving…' : 'Save brew'}
        </button>
      </div>
    </div>
  )
}
