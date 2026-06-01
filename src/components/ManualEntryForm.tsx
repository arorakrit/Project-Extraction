import { useState, type FormEvent } from 'react'
import type { ExtractedCoffee } from '@/ai/schemas/extraction'

interface ManualEntryFormProps {
  onSubmit: (extracted: ExtractedCoffee) => void
  onCancel: () => void
}

const EMPTY: ExtractedCoffee = {
  roaster_name: null,
  coffee_name: null,
  origin_country: null,
  origin_region: null,
  variety: null,
  process: null,
  roast_level: null,
  tasting_notes: [],
}

const FIELDS: Array<{
  key: keyof Omit<ExtractedCoffee, 'tasting_notes'>
  label: string
}> = [
  { key: 'roaster_name', label: 'Roaster' },
  { key: 'coffee_name', label: 'Coffee' },
  { key: 'origin_country', label: 'Origin country' },
  { key: 'origin_region', label: 'Region' },
  { key: 'variety', label: 'Variety' },
  { key: 'process', label: 'Process' },
  { key: 'roast_level', label: 'Roast' },
]

export function ManualEntryForm({ onSubmit, onCancel }: ManualEntryFormProps) {
  const [draft, setDraft] = useState<ExtractedCoffee>(EMPTY)
  const [newNote, setNewNote] = useState('')

  function update(
    key: keyof Omit<ExtractedCoffee, 'tasting_notes'>,
    value: string,
  ): void {
    const trimmed = value.trim()
    setDraft(prev => ({ ...prev, [key]: trimmed === '' ? null : trimmed }))
  }

  function addNote(): void {
    const trimmed = newNote.trim()
    if (!trimmed) return
    setDraft(prev => ({
      ...prev,
      tasting_notes: [...prev.tasting_notes, trimmed],
    }))
    setNewNote('')
  }

  function removeNote(idx: number): void {
    setDraft(prev => ({
      ...prev,
      tasting_notes: prev.tasting_notes.filter((_, i) => i !== idx),
    }))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    onSubmit(draft)
  }

  const canSubmit =
    draft.roaster_name !== null ||
    draft.coffee_name !== null ||
    draft.origin_country !== null ||
    draft.tasting_notes.length > 0

  return (
    <form
      onSubmit={handleSubmit}
      style={{ padding: 'var(--space-4)', maxWidth: 430, margin: '0 auto' }}
    >
      <h1 style={{ fontSize: 'var(--font-size-xl)', margin: '0 0 var(--space-4)' }}>
        Enter manually
      </h1>

      {FIELDS.map(({ key, label }) => (
        <label key={key} style={{ display: 'block', marginBottom: 'var(--space-3)' }}>
          <span
            style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
              marginBottom: 'var(--space-1)',
            }}
          >
            {label}
          </span>
          <input
            type="text"
            value={draft[key] ?? ''}
            onChange={e => update(key, e.target.value)}
          />
        </label>
      ))}

      <div style={{ marginTop: 'var(--space-4)' }}>
        <p
          style={{
            margin: '0 0 var(--space-2)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Tasting notes
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {draft.tasting_notes.map((note, i) => (
            <button
              type="button"
              key={`${note}-${i}`}
              onClick={() => removeNote(i)}
              aria-label={`Remove ${note}`}
              style={{
                fontSize: 'var(--font-size-sm)',
                padding: '4px 12px',
                background: 'var(--color-bg-secondary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 999,
                minHeight: 32,
              }}
            >
              {note} ×
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          <input
            type="text"
            placeholder="Add a note…"
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addNote()
              }
            }}
          />
          <button type="button" onClick={addNote} disabled={!newNote.trim()}>
            Add
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          marginTop: 'var(--space-6)',
        }}
      >
        <button type="button" onClick={onCancel} style={{ flex: 1 }}>
          Cancel
        </button>
        <button
          type="submit"
          className="primary"
          disabled={!canSubmit}
          style={{ flex: 1 }}
        >
          Done
        </button>
      </div>
    </form>
  )
}
