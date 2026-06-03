import { useEffect, useState } from 'react'
import { SettingsView } from '@/views/SettingsView'
import { ScanView } from '@/views/ScanView'
import { LibraryView } from '@/views/LibraryView'
import { CoffeeView } from '@/views/CoffeeView'
import { DrinkLogView } from '@/views/DrinkLogView'
import { DrinksView } from '@/views/DrinksView'

export type Route = string // hash routes: '#/scan', '#/library', '#/drinks', '#/log', '#/settings', '#/coffee/<id>'

let pendingRoute: string | null = null

export function getCurrentRoute(): Route {
  return window.location.hash || '#/scan'
}

export function navigate(route: string): void {
  window.location.hash = route
}

export function setPendingRoute(route: string): void {
  pendingRoute = route
}

export function popPendingRoute(): string | null {
  const r = pendingRoute
  pendingRoute = null
  return r
}

export function App() {
  const [route, setRoute] = useState<Route>(getCurrentRoute())

  useEffect(() => {
    const handler = () => setRoute(getCurrentRoute())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  let body
  if (route === '#/settings') {
    body = <SettingsView />
  } else if (route === '#/library') {
    body = <LibraryView key={route} />
  } else if (route === '#/drinks') {
    body = <DrinksView key={route} />
  } else if (route === '#/log') {
    body = <DrinkLogView key={route} />
  } else if (route.startsWith('#/coffee/')) {
    // key={route} forces re-mount when navigating between different coffees.
    body = <CoffeeView key={route} />
  } else {
    body = <ScanView />
  }

  // The logging form is itself the "log a drink" surface; the FAB would be
  // redundant (and would overlap the Save button) there.
  const showFab = route !== '#/log'

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: 640,
        margin: '0 auto',
      }}
    >
      <main style={{ flex: 1 }}>{body}</main>
      {showFab && <LogDrinkFab />}
      <Nav route={route} />
    </div>
  )
}

/** Persistent "Log a drink" floating action button (FR-001). */
function LogDrinkFab() {
  return (
    <button
      type="button"
      aria-label="Log a drink"
      onClick={() => navigate('#/log')}
      className="primary"
      style={{
        position: 'fixed',
        right: 'var(--space-4)',
        bottom: 'calc(var(--touch-target-min) + var(--space-6))',
        minHeight: 56,
        minWidth: 56,
        borderRadius: 999,
        fontSize: 'var(--font-size-xl)',
        lineHeight: 1,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        zIndex: 10,
      }}
    >
      +
    </button>
  )
}

function Nav({ route }: { route: Route }) {
  const items: Array<{ to: string; label: string }> = [
    { to: '#/scan', label: 'Scan' },
    { to: '#/library', label: 'Library' },
    { to: '#/drinks', label: 'Drinks' },
    { to: '#/settings', label: 'Settings' },
  ]
  const isActive = (to: string) =>
    route === to || (to !== '#/scan' && route.startsWith(`${to}/`))

  return (
    <nav
      style={{
        display: 'flex',
        borderTop: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-bg-primary)',
        position: 'sticky',
        bottom: 0,
      }}
    >
      {items.map(item => (
        <button
          key={item.to}
          onClick={() => navigate(item.to)}
          style={{
            flex: 1,
            border: 'none',
            background: 'transparent',
            padding: 'var(--space-3) 0',
            minHeight: 'var(--touch-target-min)',
            fontWeight: isActive(item.to) ? 600 : 400,
            color: isActive(item.to)
              ? 'var(--color-text-primary)'
              : 'var(--color-text-secondary)',
            borderRadius: 0,
          }}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
