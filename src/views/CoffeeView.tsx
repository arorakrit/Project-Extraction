import { useEffect, useState } from 'react'
import { CoffeeCard } from '@/components/CoffeeCard'
import { deleteCoffee, getCoffee, type SavedCoffee } from '@/store/coffees'
import { getCurrentRoute, navigate } from '@/App'

function parseCoffeeId(route: string): string | null {
  const m = route.match(/^#\/coffee\/(.+)$/)
  return m?.[1] ?? null
}

export function CoffeeView() {
  const [coffee, setCoffee] = useState<SavedCoffee | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const id = parseCoffeeId(getCurrentRoute())
    if (!id) {
      setLoaded(true)
      return
    }
    void getCoffee(id).then(c => {
      setCoffee(c)
      setLoaded(true)
    })
  }, [])

  async function handleDelete(): Promise<void> {
    if (!coffee) return
    await deleteCoffee(coffee.id)
    navigate('#/library')
  }

  if (!loaded) {
    return (
      <div
        style={{
          padding: 'var(--space-6) var(--space-4)',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
        }}
      >
        Loading…
      </div>
    )
  }

  if (!coffee) {
    return (
      <div
        style={{
          padding: 'var(--space-6) var(--space-4)',
          textAlign: 'center',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>Coffee not found.</p>
        <button
          type="button"
          onClick={() => navigate('#/library')}
          style={{ marginTop: 'var(--space-4)' }}
        >
          Back to library
        </button>
      </div>
    )
  }

  return <CoffeeCard coffee={coffee} onDelete={handleDelete} />
}
