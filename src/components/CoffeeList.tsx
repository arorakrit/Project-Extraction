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
        <p style={{ margin: 0 }}>No coffees yet — scan a bag to get started.</p>
      </div>
    )
  }

  return (
    <div>
      {coffees.map(c => (
        <button
          type="button"
          key={c.id}
          onClick={() => onSelect(c.id)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: 'var(--space-3) var(--space-4)',
            background: 'transparent',
            border: 'none',
            borderBottom: '0.5px solid var(--color-border-tertiary)',
            borderRadius: 0,
            minHeight: 'var(--touch-target-min)',
          }}
        >
          <p
            style={{
              margin: '0 0 2px',
              fontWeight: 500,
              fontSize: 'var(--font-size-base)',
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
