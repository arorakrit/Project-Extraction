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

function formatWhen(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? iso
    : d
        .toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
        .toUpperCase()
}

/** One drink-history row, as the Cup'd "log card". */
export function DrinkCard({ drink }: DrinkCardProps) {
  const meta = [
    drink.origin_country,
    drink.process ? PROCESS_LABELS[drink.process] : null,
    drink.roast_level ? ROAST_LABELS[drink.roast_level] : null,
  ].filter((p): p is string => Boolean(p))

  return (
    <div
      className="card card--accent"
      style={{ marginBottom: 'var(--space-3)' }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-2)',
        }}
      >
        {drink.venue ? (
          <span
            className="data"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              textTransform: 'uppercase',
              fontSize: '0.68rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{
                width: 12,
                height: 12,
                stroke: 'var(--color-accent)',
                fill: 'none',
                strokeWidth: 1.5,
              }}
            >
              <path d="M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
            {drink.venue}
          </span>
        ) : (
          <span />
        )}
        <time
          className="data"
          dateTime={drink.logged_at}
          style={{
            fontSize: '0.66rem',
            color: 'var(--color-text-tertiary)',
            whiteSpace: 'nowrap',
          }}
        >
          {formatWhen(drink.logged_at)}
        </time>
      </div>

      <p
        className="font-display"
        style={{
          margin: 0,
          fontWeight: 700,
          fontSize: '1.4rem',
          lineHeight: 1.1,
          color: 'var(--color-text-primary)',
        }}
      >
        {drink.coffee_name ?? 'Untitled drink'}
      </p>

      {meta.length > 0 && (
        <p
          style={{
            margin: 'var(--space-1) 0 0',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {meta.join(' · ')}
        </p>
      )}

      <p
        className="data"
        style={{
          margin: 'var(--space-3) 0 0',
          fontWeight: 700,
          fontSize: '1.05rem',
          color: 'var(--color-accent)',
        }}
      >
        {drink.rating.toFixed(1)}{' '}
        <span style={{ color: 'var(--color-text-secondary)', fontWeight: 400 }}>
          / 5.0
        </span>
      </p>

      {drink.flavour_tags.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--space-2)',
            marginTop: 'var(--space-3)',
          }}
        >
          {drink.flavour_tags.map(tag => (
            <span key={tag} className="tag">
              {FLAVOUR_LABELS[tag]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
