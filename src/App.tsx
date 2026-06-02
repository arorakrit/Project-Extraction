import { useEffect, useState } from 'react'
import { SettingsView } from '@/views/SettingsView'
import { ScanView } from '@/views/ScanView'
import { LibraryView } from '@/views/LibraryView'
import { CoffeeView } from '@/views/CoffeeView'

export type Route = string // hash routes: '#/scan', '#/library', '#/settings', '#/coffee/<id>'

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
  } else if (route.startsWith('#/coffee/')) {
    // key={route} forces re-mount when navigating between different coffees.
    body = <CoffeeView key={route} />
  } else {
    body = <ScanView />
  }

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
      <Nav route={route} />
    </div>
  )
}

function Nav({ route }: { route: Route }) {
  const items: Array<{ to: string; label: string }> = [
    { to: '#/scan', label: 'Scan' },
    { to: '#/library', label: 'Library' },
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
