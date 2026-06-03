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

export function DrinkLogForm({ onSubmit, onCancel }: DrinkLogFormProps) {
  const [rating, setRating] = useState<Rating | null>(null)
  const [venue, setVenue] = useState('')
  const [coffeeName, setCoffeeName] = useState('')
  const [origin, setOrigin] = useState('')
  const [process, setProcess] = useState<Process | null>(null)
  const [roast, setRoast] = useState<RoastLevel | null>(null)
  const [tags, setTags] = useState<FlavourTag[]>([])
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
        <span style={labelStyle}>Rating (required)</span>
        <StarRating value={rating} onChange={setRating} />
      </div>

      <div style={fieldStyle}>
        <span style={labelStyle}>Venue</span>
        <VenueInput value={venue} onChange={setVenue} suggestions={venues} />
      </div>

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

      <div style={fieldStyle}>
        <span style={labelStyle}>Flavour</span>
        <FlavourTagPicker value={tags} onChange={setTags} />
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
