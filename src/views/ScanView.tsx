import { useState } from 'react'
import { Scanner } from '@/components/Scanner'
import { ReviewCard } from '@/components/ReviewCard'
import { ErrorState } from '@/components/ErrorState'
import { ManualEntryForm } from '@/components/ManualEntryForm'
import type { ExtractedCoffee } from '@/ai/schemas/extraction'
import {
  ClaudeNetworkError,
  ClaudeSchemaError,
  ExtractionEmptyError,
  MissingApiKeyError,
  extractCoffeeLabel,
} from '@/ai/client'
import { navigate, setPendingRoute } from '@/App'
import { addCoffee, type SavedCoffee } from '@/store/coffees'
import { LogDrinkEntry } from '@/components/LogDrinkEntry'

type ErrorReason = 'no_text' | 'network' | 'schema' | 'built_in_key_rejected'

type ScanState =
  | { kind: 'idle' }
  | { kind: 'extracting'; imageDataUrl: string }
  | {
      kind: 'review'
      imageDataUrl: string | null
      extracted: ExtractedCoffee
    }
  | { kind: 'error'; reason: ErrorReason }
  | { kind: 'manual' }

export function ScanView() {
  const [state, setState] = useState<ScanState>({ kind: 'idle' })

  async function handleCapture(dataUrl: string): Promise<void> {
    setState({ kind: 'extracting', imageDataUrl: dataUrl })
    try {
      const extracted = await extractCoffeeLabel(dataUrl)
      setState({ kind: 'review', imageDataUrl: dataUrl, extracted })
    } catch (err) {
      if (err instanceof MissingApiKeyError) {
        setPendingRoute('#/scan')
        navigate('#/settings')
        return
      }
      if (
        err instanceof ExtractionEmptyError ||
        err instanceof ClaudeSchemaError
      ) {
        setState({ kind: 'error', reason: 'no_text' })
        return
      }
      if (err instanceof ClaudeNetworkError) {
        // 005 FR-008: a rejected built-in key needs an actionable message
        // naming the credential — not the generic network error.
        const builtInRejected =
          err.status === 401 && err.keySource === 'built-in'
        setState({
          kind: 'error',
          reason: builtInRejected ? 'built_in_key_rejected' : 'network',
        })
        return
      }
      console.error('Unexpected extraction error:', err)
      setState({ kind: 'error', reason: 'network' })
    }
  }

  async function handleAccept(
    _final: ExtractedCoffee,
    edits: Partial<ExtractedCoffee>,
  ): Promise<void> {
    if (state.kind !== 'review') return
    const coffee: SavedCoffee = {
      id: crypto.randomUUID(),
      captured_at: new Date().toISOString(),
      source_image_data_url: state.imageDataUrl,
      extracted: state.extracted,
      user_edits: edits,
      enriched: null,
      enrichment_attempted_at: null,
      schema_version: 1,
    }
    await addCoffee(coffee)
    setState({ kind: 'idle' })
    navigate(`#/coffee/${coffee.id}`)
  }

  function handleManualSubmit(extracted: ExtractedCoffee): void {
    setState({ kind: 'review', imageDataUrl: null, extracted })
  }

  switch (state.kind) {
    case 'manual':
      return (
        <ManualEntryForm
          onSubmit={handleManualSubmit}
          onCancel={() => setState({ kind: 'idle' })}
        />
      )

    case 'review':
      return (
        <ReviewCard
          extracted={state.extracted}
          imageDataUrl={state.imageDataUrl}
          onAccept={handleAccept}
        />
      )

    case 'error':
      return (
        <ErrorState
          reason={state.reason}
          onRetry={() => setState({ kind: 'idle' })}
          onManualEntry={() => setState({ kind: 'manual' })}
        />
      )

    case 'idle':
    case 'extracting':
      return (
        <>
          <Scanner
            status={state.kind === 'extracting' ? 'extracting' : 'idle'}
            onCapture={handleCapture}
            onManualEntry={() => setState({ kind: 'manual' })}
          />
          {state.kind === 'idle' && (
            <LogDrinkEntry onClick={() => navigate('#/log')} />
          )}
        </>
      )
  }
}
