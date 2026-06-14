import { useState } from 'react'
import { DrinkLogForm } from '@/components/DrinkLogForm'
import { DrinkRecorder } from '@/components/DrinkRecorder'
import {
  addDrink,
  makeDrinkLog,
  resolveVenueCasing,
  type DrinkInput,
} from '@/store/drinks'
import { navigate } from '@/App'
import type { VoiceDrinkDraft } from '@/ai/schemas/drink'

/**
 * Route #/log — café-first drink logging (006). Voice recorder on top; the
 * form below doubles as the review surface for a voice draft (FR-012):
 * a draft only ever prefills the form, and Save remains the single
 * persistence path — dismissing/navigating away saves nothing.
 */
export function DrinkLogView() {
  const [draft, setDraft] = useState<Partial<DrinkInput> | null>(null)

  async function handleDraft(voice: VoiceDrinkDraft): Promise<void> {
    // Adopt an existing café's casing so voice never mints a near-duplicate
    // venue (FR-015); unmatched names are kept verbatim.
    const venue =
      voice.venue !== null ? await resolveVenueCasing(voice.venue) : null
    setDraft({
      venue,
      coffee_name: voice.coffee_name,
      rating: voice.rating ?? undefined,
      flavour_tags: [...voice.flavour_tags],
    })
  }

  async function handleSubmit(input: DrinkInput): Promise<void> {
    const entry = makeDrinkLog(input)
    await addDrink(entry)
    navigate('#/drinks')
  }

  return (
    <div>
      <div style={{ padding: 'var(--space-4) var(--space-4) 0', maxWidth: 430, margin: '0 auto' }}>
        <DrinkRecorder onDraft={draft => void handleDraft(draft)} />
      </div>
      <DrinkLogForm
        // Re-mount on each new draft so seeded state applies cleanly.
        key={draft === null ? 'manual' : JSON.stringify(draft)}
        initial={draft ?? undefined}
        onSubmit={input => void handleSubmit(input)}
        onCancel={() => navigate('#/drinks')}
      />
    </div>
  )
}
