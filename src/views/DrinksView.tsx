import { useEffect, useState } from 'react'
import { DrinkCard } from '@/components/DrinkCard'
import { listDrinks, type DrinkLog } from '@/store/drinks'
import { navigate } from '@/App'

/** Route #/drinks — drink history, newest first. */
export function DrinksView() {
  const [drinks, setDrinks] = useState<DrinkLog[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void listDrinks().then(list => {
      setDrinks(list)
      setLoaded(true)
    })
  }, [])

  return (
    <div>
      <h1
        style={{
          padding: 'var(--space-4) var(--space-4) var(--space-3)',
          margin: 0,
          fontSize: 'var(--font-size-xl)',
        }}
      >
        Drinks
      </h1>

      {!loaded ? null : drinks.length === 0 ? (
        <div
          style={{
            padding: 'var(--space-8) var(--space-4)',
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
          }}
        >
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
            <DrinkCard key={drink.id} drink={drink} />
          ))}
        </div>
      )}
    </div>
  )
}
