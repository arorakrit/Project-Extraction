import { useCallback, useEffect, useState } from 'react'
import { BrewFields } from '@/components/BrewFields'
import {
  brewEditsFrom,
  deleteBrew,
  effectiveBrew,
  listBrewsForCoffee,
  updateBrew,
  type BrewLogEntry,
} from '@/store/brews'
import { deriveRatio } from '@/lib/ratio'
import type { StructuredBrew } from '@/ai/schemas/brew'

interface BrewTimelineProps {
  coffeeId: string
  /** Bump to force a reload (e.g. after a new brew is saved). */
  refreshToken: number
  onLogFirst: () => void
}

function ratioLabel(brew: StructuredBrew): string | null {
  const derived = deriveRatio(brew.dose_g, brew.water_g) ?? brew.ratio
  return derived === null ? null : `1:${derived}`
}

function summaryLine(brew: StructuredBrew): string {
  const parts = [brew.brew_method, ratioLabel(brew), brew.grind].filter(
    (p): p is string => Boolean(p),
  )
  return parts.length > 0 ? parts.join(' · ') : 'Brew'
}

function formatLoggedAt(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}

export function BrewTimeline({
  coffeeId,
  refreshToken,
  onLogFirst,
}: BrewTimelineProps) {
  const [brews, setBrews] = useState<BrewLogEntry[] | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<StructuredBrew | null>(null)

  const reload = useCallback(async () => {
    const rows = await listBrewsForCoffee(coffeeId)
    setBrews(rows)
  }, [coffeeId])

  useEffect(() => {
    void reload()
  }, [reload, refreshToken])

  function startEdit(entry: BrewLogEntry): void {
    setEditingId(entry.id)
    setDraft(effectiveBrew(entry))
  }

  function cancelEdit(): void {
    setEditingId(null)
    setDraft(null)
  }

  async function saveEdit(entry: BrewLogEntry): Promise<void> {
    if (!draft) return
    await updateBrew(entry.id, {
      user_edits: brewEditsFrom(entry.structured, draft),
    })
    cancelEdit()
    await reload()
  }

  async function handleDelete(id: string): Promise<void> {
    await deleteBrew(id)
    if (editingId === id) cancelEdit()
    await reload()
  }

  if (brews === null) return null

  if (brews.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: 'var(--space-6) var(--space-4)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <p style={{ margin: '0 0 var(--space-4)' }}>No brews logged yet.</p>
        <button
          type="button"
          className="primary"
          onClick={onLogFirst}
          style={{ minHeight: 'var(--touch-target-min)' }}
        >
          Log your first brew
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 'var(--space-4)', maxWidth: 430, margin: '0 auto' }}>
      <h2 style={{ fontSize: 'var(--font-size-lg)', margin: '0 0 var(--space-3)' }}>
        Brew history
      </h2>

      {brews.map(entry => {
        const eff = effectiveBrew(entry)
        const isEditing = editingId === entry.id
        return (
          <div
            key={entry.id}
            style={{
              borderBottom: '0.5px solid var(--color-border-tertiary)',
              padding: 'var(--space-3) 0',
            }}
          >
            {isEditing ? (
              <div>
                <BrewFields value={draft ?? eff} onChange={setDraft} />
                <div
                  style={{
                    display: 'flex',
                    gap: 'var(--space-2)',
                    marginTop: 'var(--space-3)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void handleDelete(entry.id)}
                    style={{ color: 'var(--color-error)' }}
                  >
                    Delete
                  </button>
                  <div style={{ flex: 1 }} />
                  <button type="button" onClick={cancelEdit}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => void saveEdit(entry)}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(entry)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  padding: 'var(--space-1) 0',
                  minHeight: 'var(--touch-target-min)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span style={{ color: 'var(--color-text-primary)' }}>
                    {summaryLine(eff)}
                  </span>
                  <span
                    style={{
                      color: 'var(--color-text-tertiary)',
                      fontSize: 'var(--font-size-sm)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatLoggedAt(entry.logged_at)}
                  </span>
                </div>
                {eff.tasting_note && (
                  <p
                    style={{
                      margin: 'var(--space-1) 0 0',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--color-text-secondary)',
                    }}
                  >
                    {eff.tasting_note}
                  </p>
                )}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
