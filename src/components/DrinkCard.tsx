import { FLAVOUR_LABELS } from '@/lib/flavours'
import type { DrinkLog } from '@/store/drinks'
import { navigate } from '@/App'

interface DrinkCardProps {
  drink: DrinkLog
  /**
   * Hide the café tap-through (used on the venue-filtered view, where every
   * card is already that café's — tapping through again would be circular).
   */
  venueLinked?: boolean
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

/** Route for one café's drinks (006): stored name → venue view hash. */
export function venueRoute(venue: string | null): string {
  return venue === null
    ? '#/drinks/no-cafe'
    : `#/drinks/at/${encodeURIComponent(venue)}`
}

/**
 * One drink-history row, as the Cup'd "log card". Café-first (006 FR-005):
 * the café is the headline; the drink, rating, and tags are secondary detail.
 * Tapping the café opens that café's history (FR-006/007).
 */
export function DrinkCard({ drink, venueLinked = true }: DrinkCardProps) {
  const meta = [
    drink.coffee_name,
    drink.origin_country,
    drink.process ? PROCESS_LABELS[drink.process] : null,
    drink.roast_level ? ROAST_LABELS[drink.roast_level] : null,
  ].filter((p): p is string => Boolean(p))

  const headline = (
    <span
      className="font-display"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        fontWeight: 700,
        fontSize: '1.4rem',
        lineHeight: 1.1,
        textAlign: 'left',
        color: drink.venue
          ? 'var(--color-text-primary)'
          : 'var(--color-text-tertiary)',
      }}
    >
      {drink.venue && (
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            stroke: 'var(--color-accent)',
            fill: 'none',
            strokeWidth: 1.5,
          }}
        >
          <path d="M12 21s-7-6.3-7-11a7 7 0 1114 0c0 4.7-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      )}
      {drink.venue ?? 'No café'}
    </span>
  )

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
        }}
      >
        {venueLinked ? (
          <button
            type="button"
            aria-label={
              drink.venue
                ? `All drinks at ${drink.venue}`
                : 'All drinks with no café'
            }
            onClick={() => navigate(venueRoute(drink.venue))}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              minHeight: 'var(--touch-target-min)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {headline}
          </button>
        ) : (
          <span
            style={{
              minHeight: 'var(--touch-target-min)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {headline}
          </span>
        )}
        <time
          className="data"
          dateTime={drink.logged_at}
          style={{
            fontSize: '0.66rem',
            color: 'var(--color-text-tertiary)',
            whiteSpace: 'nowrap',
            paddingTop: 'var(--space-2)',
          }}
        >
          {formatWhen(drink.logged_at)}
        </time>
      </div>

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
