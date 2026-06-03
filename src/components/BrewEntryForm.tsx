import { useState } from 'react'
import { BrewFields } from '@/components/BrewFields'
import { addBrew, brewEditsFrom, type BrewLogEntry } from '@/store/brews'
import { emptyBrew, type StructuredBrew } from '@/ai/schemas/brew'

interface BrewEntryFormProps {
  coffeeId: string
  /** Pre-fill the tasting note (e.g. a transcript salvaged from a failed structuring). */
  initialTastingNote?: string | null
  onSaved: () => void
  onCancel: () => void
}

export function BrewEntryForm({
  coffeeId,
  initialTastingNote = null,
  onSaved,
  onCancel,
}: BrewEntryFormProps) {
  const [draft, setDraft] = useState<StructuredBrew>(() => ({
    ...emptyBrew(),
    tasting_note: initialTastingNote,
  }))
  const [saving, setSaving] = useState(false)

  async function handleSave(): Promise<void> {
    setSaving(true)
    const base = emptyBrew()
    const entry: BrewLogEntry = {
      id: crypto.randomUUID(),
      coffee_id: coffeeId,
      logged_at: new Date().toISOString(),
      source: 'manual',
      transcript: null,
      structured: base,
      user_edits: brewEditsFrom(base, draft),
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
        Log a brew
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
