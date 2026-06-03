import type { SavedCoffee } from '@/store/coffees'

interface CoffeeListProps {
  coffees: SavedCoffee[]
  onSelect: (id: string) => void
}

function displayName(coffee: SavedCoffee): string {
  return (
    coffee.user_edits.coffee_name ??
    coffee.extracted.coffee_name ??
    'Untitled coffee'
  )
}

function displayMeta(coffee: SavedCoffee): string {
  const roaster =
    coffee.user_edits.roaster_name ?? coffee.extracted.roaster_name
  const origin =
    coffee.user_edits.origin_country ?? coffee.extracted.origin_country
  const parts = [roaster, origin].filter((p): p is string => Boolean(p))
  return parts.length > 0 ? parts.join(' · ') : '—'
}

export function CoffeeList({ coffees, onSelect }: CoffeeListProps) {
  if (coffees.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-8) var(--space-4)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p style={{ margin: 0 }}>Nothing here yet — scan a bag and start your shelf.</p>
      </div>
    )
  }

  return (
    <div
      style={{ padding: '0 var(--space-4) var(--space-8)', maxWidth: 430, margin: '0 auto' }}
    >
      {coffees.map(c => (
        <button
          type="button"
          key={c.id}
          onClick={() => onSelect(c.id)}
          className="card card--accent"
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            marginBottom: 'var(--space-3)',
            minHeight: 'var(--touch-target-min)',
          }}
        >
          <p
            className="font-display"
            style={{
              margin: '0 0 4px',
              fontWeight: 700,
              fontSize: '1.25rem',
              lineHeight: 1.1,
              color: 'var(--color-text-primary)',
            }}
          >
            {displayName(c)}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-text-secondary)',
            }}
          >
            {displayMeta(c)}
          </p>
        </button>
      ))}
    </div>
  )
}
