import { useState, type ChangeEvent } from 'react'
import type { ExtractedCoffee } from '@/ai/schemas/extraction'

type ScalarKey = keyof Omit<ExtractedCoffee, 'tasting_notes'>

interface ReviewCardProps {
  extracted: ExtractedCoffee
  imageDataUrl: string | null
  onAccept: (final: ExtractedCoffee, userEdits: Partial<ExtractedCoffee>) => void
}

const FIELDS: Array<{ key: ScalarKey; label: string }> = [
  { key: 'origin_country', label: 'Origin country' },
  { key: 'origin_region', label: 'Region' },
  { key: 'variety', label: 'Variety' },
  { key: 'process', label: 'Process' },
  { key: 'roast_level', label: 'Roast' },
]

export function ReviewCard({ extracted, imageDataUrl, onAccept }: ReviewCardProps) {
  const [edits, setEdits] = useState<Partial<ExtractedCoffee>>({})
  const [newNote, setNewNote] = useState('')

  function effective(key: ScalarKey): string | null {
    return key in edits ? ((edits[key] as string | null | undefined) ?? null) : extracted[key]
  }

  function effectiveNotes(): string[] {
    return edits.tasting_notes ?? extracted.tasting_notes
  }

  function setField(key: ScalarKey, value: string): void {
    const trimmed = value.trim()
    setEdits(prev => ({ ...prev, [key]: trimmed === '' ? null : trimmed }))
  }

  function setHeaderField(key: ScalarKey, value: string): void {
    setField(key, value)
  }

  function addNote(): void {
    const trimmed = newNote.trim()
    if (!trimmed) return
    setEdits(prev => ({
      ...prev,
      tasting_notes: [...effectiveNotes(), trimmed],
    }))
    setNewNote('')
  }

  function removeNote(idx: number): void {
    setEdits(prev => ({
      ...prev,
      tasting_notes: effectiveNotes().filter((_, i) => i !== idx),
    }))
  }

  function handleAccept(): void {
    const final: ExtractedCoffee = {
      roaster_name: effective('roaster_name'),
      coffee_name: effective('coffee_name'),
      origin_country: effective('origin_country'),
      origin_region: effective('origin_region'),
      variety: effective('variety'),
      process: effective('process'),
      roast_level: effective('roast_level'),
      tasting_notes: effectiveNotes(),
    }
    onAccept(final, edits)
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 430, margin: '0 auto' }}>
      {imageDataUrl && (
        <img
          src={imageDataUrl}
          alt="Captured bag"
          style={{
            width: '100%',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-4)',
            display: 'block',
          }}
        />
      )}

      <HeaderField
        label="Coffee"
        value={effective('coffee_name')}
        emptyLabel="Unknown coffee"
        bold
        onChange={v => setHeaderField('coffee_name', v)}
      />
      <HeaderField
        label="Roaster"
        value={effective('roaster_name')}
        emptyLabel="—"
        onChange={v => setHeaderField('roaster_name', v)}
      />

      <div style={{ marginTop: 'var(--space-6)' }}>
        {FIELDS.map(({ key, label }) => (
          <FieldRow
            key={key}
            label={label}
            value={effective(key)}
            onChange={v => setField(key, v)}
          />
        ))}
      </div>

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
          {effectiveNotes().map((note, i) => (
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNewNote(e.target.value)}
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

      <button
        type="button"
        className="primary"
        onClick={handleAccept}
        style={{
          width: '100%',
          marginTop: 'var(--space-6)',
          fontSize: 'var(--font-size-lg)',
        }}
      >
        Looks good
      </button>
    </div>
  )
}

function HeaderField({
  label,
  value,
  emptyLabel,
  bold,
  onChange,
}: {
  label: string
  value: string | null
  emptyLabel: string
  bold?: boolean
  onChange: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  function commit(): void {
    onChange(draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Escape') {
            setDraft(value ?? '')
            setEditing(false)
          }
        }}
        aria-label={label}
        style={{
          fontSize: bold ? 'var(--font-size-xl)' : 'var(--font-size-base)',
          fontWeight: bold ? 500 : 400,
          width: '100%',
          marginBottom: 'var(--space-1)',
        }}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value ?? '')
        setEditing(true)
      }}
      aria-label={`Edit ${label}`}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        textAlign: 'left',
        fontSize: bold ? 'var(--font-size-xl)' : 'var(--font-size-base)',
        fontWeight: bold ? 500 : 400,
        color:
          value === null
            ? 'var(--color-text-tertiary)'
            : 'var(--color-text-primary)',
        minHeight: 'var(--touch-target-min)',
        width: '100%',
        marginBottom: 'var(--space-1)',
        display: 'block',
      }}
    >
      {value ?? emptyLabel}
    </button>
  )
}

function FieldRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | null
  onChange: (next: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')

  function commit(): void {
    onChange(draft)
    setEditing(false)
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-3) 0',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        minHeight: 'var(--touch-target-min)',
        gap: 'var(--space-3)',
      }}
    >
      <span
        style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              setDraft(value ?? '')
              setEditing(false)
            }
          }}
          aria-label={`Edit ${label}`}
          style={{ textAlign: 'right', flex: 1, minHeight: 36 }}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(value ?? '')
            setEditing(true)
          }}
          aria-label={`Edit ${label}`}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'right',
            color:
              value === null
                ? 'var(--color-text-tertiary)'
                : 'var(--color-text-primary)',
            fontSize: 'var(--font-size-base)',
            minHeight: 'var(--touch-target-min)',
            width: '100%',
            justifyContent: 'flex-end',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {value ?? '—'}
        </button>
      )}
    </div>
  )
}
