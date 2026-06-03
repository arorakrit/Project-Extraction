import { useId } from 'react'

interface VenueInputProps {
  value: string
  onChange: (value: string) => void
  /** Prior venues to suggest (from listVenues()). */
  suggestions: string[]
}

/**
 * Type-ahead venue field. Backed by a native <datalist> so a free-typed value
 * is always accepted (FR-004). Suggestions are filtered by the typed text so
 * the prior-venue match surfaces quickly (FR-005, SC-005).
 */
export function VenueInput({ value, onChange, suggestions }: VenueInputProps) {
  const listId = useId()
  const query = value.trim().toLowerCase()
  const filtered =
    query === ''
      ? suggestions
      : suggestions.filter(s => s.toLowerCase().includes(query))

  return (
    <>
      <input
        type="text"
        list={listId}
        value={value}
        placeholder="Café, roaster stand, or event"
        aria-label="Venue"
        onChange={e => onChange(e.target.value)}
      />
      <datalist id={listId}>
        {filtered.map(s => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  )
}
