import { useEffect, useState } from 'react'
import { DrinkCard } from '@/components/DrinkCard'
import {
  listDrinks,
  listDrinksByVenue,
  type DrinkLog,
} from '@/store/drinks'
import { navigate } from '@/App'

interface DrinksViewProps {
  /**
   * Venue-filtered mode (006 FR-006/FR-007): a café name shows that café's
   * drinks; `null` shows the labelled "No café" bucket. Omitted = full
   * history. Matching is case-insensitive in the store layer.
   */
  venueFilter?: string | null
}

/** Routes #/drinks, #/drinks/at/<venue>, #/drinks/no-cafe — newest first. */
export function DrinksView({ venueFilter }: DrinksViewProps) {
  const filtered = venueFilter !== undefined
  const [drinks, setDrinks] = useState<DrinkLog[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const load = filtered ? listDrinksByVenue(venueFilter ?? null) : listDrinks()
    void load.then(list => {
      setDrinks(list)
      setLoaded(true)
    })
  }, [filtered, venueFilter])

  // Title in the café's stored casing once entries load (the hash segment may
  // differ in case); before load — or for an unknown café — show it as typed.
  const title = !filtered
    ? 'Drinks'
    : venueFilter === null
      ? 'No café'
      : (drinks[0]?.venue ?? venueFilter)

  return (
    <div>
      <header style={{ padding: 'var(--space-4) var(--space-4) var(--space-3)' }}>
        {filtered && (
          <button
            type="button"
            onClick={() => navigate('#/drinks')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              minHeight: 'var(--touch-target-min)',
              color: 'var(--color-accent)',
              fontSize: 'var(--font-size-sm)',
            }}
          >
            ← All drinks
          </button>
        )}
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>{title}</h1>
      </header>

      {!loaded ? null : drinks.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-8) var(--space-4)',
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
          }}
        >
          {filtered ? (
            <>
              <p style={{ margin: '0 0 var(--space-4)' }}>
                Nothing logged here yet.
              </p>
              <button
                type="button"
                className="primary"
                onClick={() => navigate('#/drinks')}
              >
                Back to all drinks
              </button>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 var(--space-4)' }}>
                Nothing logged yet. What did you cup today?
              </p>
              <button
                type="button"
                className="primary"
                onClick={() => navigate('#/log')}
              >
                Log a drink
              </button>
            </>
          )}
        </div>
      ) : (
        <div
          style={{
            padding: '0 var(--space-4) var(--space-8)',
            maxWidth: 430,
            margin: '0 auto',
          }}
        >
          {drinks.map(drink => (
            <DrinkCard key={drink.id} drink={drink} venueLinked={!filtered} />
          ))}
        </div>
      )}
    </div>
  )
}
