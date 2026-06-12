import { useEffect, useState, type FormEvent } from 'react'
import { StarRating } from '@/components/StarRating'
import { VenueInput } from '@/components/VenueInput'
import { FlavourTagPicker } from '@/components/FlavourTagPicker'
import {
  listVenues,
  PROCESSES,
  ROAST_LEVELS,
  type DrinkInput,
  type Process,
  type Rating,
  type RoastLevel,
} from '@/store/drinks'
import type { FlavourTag } from '@/lib/flavours'

interface DrinkLogFormProps {
  onSubmit: (input: DrinkInput) => void
  onCancel: () => void
  /**
   * Optional seed values (006): when present — e.g. a validated voice draft —
   * every seeded field renders editable; this form IS the review surface
   * (FR-012). Absent, behaviour is identical to plain manual entry.
   */
  initial?: Partial<DrinkInput>
}

const PROCESS_LABELS: Record<Process, string> = {
  washed: 'Washed',
  natural: 'Natural',
  honey: 'Honey',
}

const ROAST_LABELS: Record<RoastLevel, string> = {
  light: 'Light',
  medium: 'Medium',
  dark: 'Dark',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-secondary)',
  marginBottom: 'var(--space-1)',
}

const fieldStyle: React.CSSProperties = { marginBottom: 'var(--space-4)' }

function initialRating(value: number | undefined): Rating | null {
  return value !== undefined && Number.isInteger(value) && value >= 1 && value <= 5
    ? (value as Rating)
    : null
}

export function DrinkLogForm({ onSubmit, onCancel, initial }: DrinkLogFormProps) {
  // Café-first (006 FR-001): venue leads the form; bean detail is demoted
  // behind the collapsed "Add drink details" expander below.
  const [venue, setVenue] = useState(initial?.venue ?? '')
  const [rating, setRating] = useState<Rating | null>(initialRating(initial?.rating))
  const [tags, setTags] = useState<FlavourTag[]>(initial?.flavour_tags ?? [])
  const [coffeeName, setCoffeeName] = useState(initial?.coffee_name ?? '')
  const [origin, setOrigin] = useState(initial?.origin_country ?? '')
  const [process, setProcess] = useState<Process | null>(initial?.process ?? null)
  const [roast, setRoast] = useState<RoastLevel | null>(initial?.roast_level ?? null)
  // Auto-expand when a seeded value lives inside the expander, so a voice
  // draft's coffee name is visible for review rather than hidden (FR-012).
  const [detailsOpen, setDetailsOpen] = useState(
    Boolean(
      initial?.coffee_name ||
        initial?.origin_country ||
        initial?.process ||
        initial?.roast_level,
    ),
  )
  const [venues, setVenues] = useState<string[]>([])

  useEffect(() => {
    void listVenues().then(setVenues)
  }, [])

  const canSave = rating !== null

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault()
    if (rating === null) return
    onSubmit({
      rating,
      venue,
      coffee_name: coffeeName,
      origin_country: origin,
      process,
      roast_level: roast,
      flavour_tags: tags,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{ padding: 'var(--space-4)', maxWidth: 430, margin: '0 auto' }}
    >
      <h1
        style={{ fontSize: 'var(--font-size-xl)', margin: '0 0 var(--space-4)' }}
      >
        Log a drink
      </h1>

      <div style={fieldStyle}>
        <span
          style={{
            ...labelStyle,
            color: 'var(--color-text-primary)',
            fontSize: 'var(--font-size-base)',
            fontWeight: 600,
          }}
        >
          Café
        </span>
        <VenueInput value={venue} onChange={setVenue} suggestions={venues} />
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Rating (required)</span>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Flavour</span>
        <FlavourTagPicker value={tags} onChange={setTags} />
      </div>

      <div style={fieldStyle}>
        <button
          type="button"
          aria-expanded={detailsOpen}
          onClick={() => setDetailsOpen(open => !open)}
          style={{
            width: '100%',
            textAlign: 'left',
            minHeight: 'var(--touch-target-min)',
            background: 'transparent',
            border: '0.5px solid var(--color-border-primary)',
            color: 'var(--color-text-secondary)',
            fontSize: 'var(--font-size-sm)',
          }}
        >
          {detailsOpen ? '− Drink details' : '+ Add drink details'}
        </button>

        {detailsOpen && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <label style={{ display: 'block', ...fieldStyle }}>
              <span style={labelStyle}>Coffee</span>
              <input
                type="text"
                value={coffeeName}
                placeholder="What are you drinking?"
                onChange={e => setCoffeeName(e.target.value)}
              />
            </label>

            <label style={{ display: 'block', ...fieldStyle }}>
              <span style={labelStyle}>Origin country</span>
              <input
                type="text"
                value={origin}
                onChange={e => setOrigin(e.target.value)}
              />
            </label>

            <div style={fieldStyle}>
              <span style={labelStyle}>Process</span>
              <Segmented
                options={PROCESSES}
                labels={PROCESS_LABELS}
                value={process}
                onChange={setProcess}
              />
            </div>

            <div style={fieldStyle}>
              <span style={labelStyle}>Roast</span>
              <Segmented
                options={ROAST_LEVELS}
                labels={ROAST_LABELS}
                value={roast}
                onChange={setRoast}
              />
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-6)' }}>
        <button type="button" onClick={onCancel} style={{ flex: 1 }}>
          Cancel
        </button>
        <button
          type="submit"
          className="primary"
          disabled={!canSave}
          style={{ flex: 1 }}
        >
          Save
        </button>
      </div>
    </form>
  )
}

/** Single-tap segmented selector; tapping the active option clears it. */
function Segmented<T extends string>({
  options,
  labels,
  value,
  onChange,
}: {
  options: readonly T[]
  labels: Record<T, string>
  value: T | null
  onChange: (value: T | null) => void
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
      {options.map(option => {
        const selected = value === option
        return (
          <button
            type="button"
            key={option}
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : option)}
            style={{
              flex: 1,
              minHeight: 'var(--touch-target-min)',
              fontSize: 'var(--font-size-sm)',
              border: selected
                ? '0.5px solid var(--color-accent)'
                : '0.5px solid var(--color-border-primary)',
              background: selected
                ? 'var(--color-accent)'
                : 'var(--color-bg-primary)',
              color: selected
                ? 'var(--color-bg-primary)'
                : 'var(--color-text-primary)',
            }}
          >
            {labels[option]}
          </button>
        )
      })}
    </div>
  )
}
