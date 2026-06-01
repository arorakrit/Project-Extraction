import { useEffect, useState } from 'react'
import { CoffeeList } from '@/components/CoffeeList'
import { listCoffees, type SavedCoffee } from '@/store/coffees'
import { navigate } from '@/App'

export function LibraryView() {
  const [coffees, setCoffees] = useState<SavedCoffee[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void listCoffees().then(list => {
      setCoffees(list)
      setLoaded(true)
    })
  }, [])

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

  return (
    <div>
      <h1
        style={{
          padding: 'var(--space-4) var(--space-4) var(--space-3)',
          margin: 0,
          fontSize: 'var(--font-size-xl)',
        }}
      >
        My coffees
      </h1>
      <CoffeeList
        coffees={coffees}
        onSelect={id => navigate(`#/coffee/${id}`)}
      />
    </div>
  )
}
