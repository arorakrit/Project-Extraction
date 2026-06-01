import type { ExtractedCoffee } from '@/ai/schemas/extraction'
import type { SavedCoffee } from '@/store/coffees'

type ScalarKey = keyof Omit<ExtractedCoffee, 'tasting_notes'>

function effectiveScalar(coffee: SavedCoffee, key: ScalarKey): string | null {
  if (key in coffee.user_edits) {
    const v = coffee.user_edits[key]
    return v === undefined ? coffee.extracted[key] : (v as string | null)
  }
  return coffee.extracted[key]
}

function effectiveNotes(coffee: SavedCoffee): string[] {
  return coffee.user_edits.tasting_notes ?? coffee.extracted.tasting_notes
}

const FIELDS: Array<{ key: ScalarKey; label: string }> = [
  { key: 'origin_country', label: 'Origin country' },
  { key: 'origin_region', label: 'Region' },
  { key: 'variety', label: 'Variety' },
  { key: 'process', label: 'Process' },
  { key: 'roast_level', label: 'Roast' },
]

interface CoffeeCardProps {
  coffee: SavedCoffee
  onDelete?: () => void
}

export function CoffeeCard({ coffee, onDelete }: CoffeeCardProps) {
  const name = effectiveScalar(coffee, 'coffee_name')
  const roaster = effectiveScalar(coffee, 'roaster_name')
  const notes = effectiveNotes(coffee)

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 430, margin: '0 auto' }}>
      {coffee.source_image_data_url && (
        <img
          src={coffee.source_image_data_url}
          alt={name ?? 'Coffee bag'}
          style={{
            width: '100%',
            borderRadius: 'var(--radius-lg)',
            marginBottom: 'var(--space-4)',
            display: 'block',
          }}
        />
      )}

      <h1
        style={{
          fontSize: 'var(--font-size-xl)',
          margin: '0 0 var(--space-1)',
          fontWeight: 500,
          color:
            name === null ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)',
        }}
      >
        {name ?? 'Unknown coffee'}
      </h1>
      <p
        style={{
          margin: '0 0 var(--space-6)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {roaster ?? '—'}
      </p>

      {notes.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            marginBottom: 'var(--space-4)',
          }}
        >
          {notes.map(n => (
            <span
              key={n}
              style={{
                fontSize: 'var(--font-size-sm)',
                padding: '4px 12px',
                background: 'var(--color-bg-secondary)',
                border: '0.5px solid var(--color-border-tertiary)',
                borderRadius: 999,
              }}
            >
              {n}
            </span>
          ))}
        </div>
      )}

      {FIELDS.map(({ key, label }) => {
        const value = effectiveScalar(coffee, key)
        return (
          <div
            key={key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: 'var(--space-3) 0',
              borderBottom: '0.5px solid var(--color-border-tertiary)',
              fontSize: 'var(--font-size-base)',
            }}
          >
            <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
            <span
              style={{
                color:
                  value === null
                    ? 'var(--color-text-tertiary)'
                    : 'var(--color-text-primary)',
              }}
            >
              {value ?? '—'}
            </span>
          </div>
        )
      })}

      {/* Enrichment sections — populated by Story 3 (T051) when coffee.enriched is non-null. */}

      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          style={{
            marginTop: 'var(--space-8)',
            width: '100%',
            background: 'transparent',
            color: 'var(--color-error)',
          }}
        >
          Delete coffee
        </button>
      )}
    </div>
  )
}
