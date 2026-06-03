import { useEffect, useRef, useState } from 'react'
import { CoffeeCard } from '@/components/CoffeeCard'
import { BrewRecorder } from '@/components/BrewRecorder'
import { BrewTimeline } from '@/components/BrewTimeline'
import {
  deleteCoffee,
  effectiveExtractedCoffee,
  getCoffee,
  type SavedCoffee,
  updateCoffee,
} from '@/store/coffees'
import { getApiKey } from '@/store/settings'
import { enrichCoffeeProfile } from '@/ai/client'
import { getCurrentRoute, navigate } from '@/App'

function parseCoffeeId(route: string): string | null {
  const m = route.match(/^#\/coffee\/(.+)$/)
  return m?.[1] ?? null
}

export function CoffeeView() {
  const [coffee, setCoffee] = useState<SavedCoffee | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [recording, setRecording] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const enrichingRef = useRef(false)

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

  // T050: enrichment auto-trigger. Fires once after the coffee loads,
  // only when it has never been enriched and never previously attempted.
  // Failures are silent to the user per the enrichment contract.
  useEffect(() => {
    if (!coffee) return
    if (coffee.enriched !== null) return
    if (coffee.enrichment_attempted_at !== null) return
    if (enrichingRef.current) return
    enrichingRef.current = true

    const coffeeId = coffee.id
    const effective = effectiveExtractedCoffee(coffee)

    void (async () => {
      const apiKey = await getApiKey()
      if (!apiKey) {
        // No key → no enrichment attempt. Don't mark attempted so the user
        // can still get enrichment on a later visit after configuring a key.
        enrichingRef.current = false
        return
      }
      const nowIso = new Date().toISOString()
      try {
        const enriched = await enrichCoffeeProfile(effective)
        await updateCoffee(coffeeId, {
          enriched,
          enrichment_attempted_at: nowIso,
        })
        setCoffee(prev =>
          prev && prev.id === coffeeId
            ? { ...prev, enriched, enrichment_attempted_at: nowIso }
            : prev,
        )
      } catch {
        // Silent. Mark attempted so we don't spin on every revisit.
        await updateCoffee(coffeeId, { enrichment_attempted_at: nowIso })
        setCoffee(prev =>
          prev && prev.id === coffeeId
            ? { ...prev, enrichment_attempted_at: nowIso }
            : prev,
        )
      }
    })()
  }, [coffee])

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

  return (
    <>
      <CoffeeCard coffee={coffee} onDelete={handleDelete} />

      <div style={{ padding: '0 var(--space-4)', maxWidth: 430, margin: '0 auto' }}>
        {recording ? (
          <BrewRecorder
            coffeeId={coffee.id}
            onSaved={() => {
              setRecording(false)
              setRefreshToken(t => t + 1)
            }}
            onClose={() => setRecording(false)}
          />
        ) : (
          <button
            type="button"
            className="primary"
            onClick={() => setRecording(true)}
            style={{ width: '100%', minHeight: 'var(--touch-target-min)' }}
          >
            Log a brew
          </button>
        )}
      </div>

      <BrewTimeline
        coffeeId={coffee.id}
        refreshToken={refreshToken}
        onLogFirst={() => setRecording(true)}
      />
    </>
  )
}
