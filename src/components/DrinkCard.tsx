import { FLAVOUR_LABELS } from '@/lib/flavours'
import type { DrinkLog } from '@/store/drinks'

interface DrinkCardProps {
  drink: DrinkLog
}

const PROCESS_LABELS: Record<string, string> = {
  washed: 'Washed',
  natural: 'Natural',
  honey: 'Honey',
}

const ROAST_LABELS: Record<string, string> = {
  light: 'Light roast',
  medium: 'Medium roast',
  dark: 'Dark roast',
}

function stars(rating: number): string {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating)
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
}

/** One drink-history row: rating, name, venue, detail, flavour tags, time. */
export function DrinkCard({ drink }: DrinkCardProps) {
  const meta = [
    drink.origin_country,
    drink.process ? PROCESS_LABELS[drink.process] : null,
    drink.roast_level ? ROAST_LABELS[drink.roast_level] : null,
  ].filter((p): p is string => Boolean(p))

  return (
    <div
      style={{
        padding: 'var(--space-3) var(--space-4)',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 'var(--space-2)',
        }}
      >
        <span
          aria-label={`${drink.rating} out of 5 stars`}
          style={{ color: 'var(--color-accent)', letterSpacing: 1 }}
        >
          {stars(drink.rating)}
        </span>
        <time
          dateTime={drink.logged_at}
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-tertiary)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatWhen(drink.logged_at)}
        </time>
      </div>

      <p
        style={{
          margin: 'var(--space-1) 0 0',
          fontWeight: 500,
          color: 'var(--color-text-primary)',
        }}
      >
        {drink.coffee_name ?? 'Untitled drink'}
      </p>

      {drink.venue && (
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {drink.venue}
        </p>
      )}

      {meta.length > 0 && (
        <p
          style={{
            margin: '2px 0 0',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {meta.join(' · ')}
        </p>
      )}

      {drink.flavour_tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-1)',
            marginTop: 'var(--space-2)',
          }}
        >
          {drink.flavour_tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: 'var(--font-size-sm)',
                padding: '2px 10px',
                borderRadius: 999,
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-secondary)',
              }}
            >
              {FLAVOUR_LABELS[tag]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
