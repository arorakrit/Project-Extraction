import { useState } from 'react'
import Scanner from './components/Scanner'
import CoffeeCard from './components/CoffeeCard'

const STORAGE_KEY = 'grind_coffees'

function loadCoffees() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [] }
  catch { return [] }
}

export default function App() {
  const [coffees, setCoffees] = useState(loadCoffees)
  const [activeCoffee, setActiveCoffee] = useState(null)
  const [view, setView] = useState('scan') // scan | coffee | list

  function handleScanComplete(coffee) {
    const updated = [coffee, ...coffees]
    setCoffees(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setActiveCoffee(coffee)
    setView('coffee')
  }

  function handleAddLog(coffeeId, log) {
    const updated = coffees.map(c =>
      c.id === coffeeId ? { ...c, logs: [...c.logs, log] } : c
    )
    setCoffees(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setActiveCoffee(updated.find(c => c.id === coffeeId))
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: 'var(--font-sans)' }}>
      <nav style={{ display: 'flex', gap: '16px', padding: '1rem', borderBottom: '0.5px solid var(--color-border-tertiary)' }}>
        <button onClick={() => setView('scan')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: view === 'scan' ? '500' : '400' }}>Scan</button>
        <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: view === 'list' ? '500' : '400' }}>My coffees ({coffees.length})</button>
      </nav>

      {view === 'scan' && <Scanner onScanComplete={handleScanComplete} />}

      {view === 'coffee' && activeCoffee && (
        <CoffeeCard coffee={activeCoffee} onAddLog={handleAddLog} />
      )}

      {view === 'list' && (
        <div style={{ padding: '1rem' }}>
          {coffees.length === 0 && <p style={{ color: 'var(--color-text-secondary)' }}>No coffees scanned yet.</p>}
          {coffees.map(c => (
            <div key={c.id} onClick={() => { setActiveCoffee(c); setView('coffee') }}
              style={{ padding: '12px', borderBottom: '0.5px solid var(--color-border-tertiary)', cursor: 'pointer' }}>
              <p style={{ margin: '0 0 2px', fontWeight: '500' }}>{c.metadata.coffee_name || 'Unknown'}</p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>{c.metadata.roaster_name} · {c.metadata.origin_country}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
