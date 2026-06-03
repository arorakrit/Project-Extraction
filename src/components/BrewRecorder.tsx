import { useState } from 'react'
import { BrewReview } from '@/components/BrewReview'
import { BrewEntryForm } from '@/components/BrewEntryForm'
import {
  structureBrewNote,
  BrewEmptyError,
  ClaudeNetworkError,
  ClaudeSchemaError,
} from '@/ai/client'
import { transcribeOnce, isSpeechRecognitionAvailable } from '@/lib/speech'
import type { StructuredBrew } from '@/ai/schemas/brew'

interface BrewRecorderProps {
  coffeeId: string
  onSaved: () => void
  onClose: () => void
}

type Mode =
  | 'idle'
  | 'listening'
  | 'structuring'
  | 'review'
  | 'empty'
  | 'error'
  | 'manual'

export function BrewRecorder({ coffeeId, onSaved, onClose }: BrewRecorderProps) {
  // When speech recognition is unavailable, skip straight to manual entry (FR-017).
  const [mode, setMode] = useState<Mode>(() =>
    isSpeechRecognitionAvailable() ? 'idle' : 'manual',
  )
  const [structured, setStructured] = useState<StructuredBrew | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [manualPrefill, setManualPrefill] = useState<string | null>(null)

  async function handleRecord(): Promise<void> {
    setMode('listening')
    let spoken: string
    try {
      spoken = await transcribeOnce()
    } catch {
      setMode('error')
      return
    }

    // Empty/whitespace transcript: short-circuit to "didn't catch that"
    // without spending a Claude call (contract precondition).
    if (spoken.trim() === '') {
      setTranscript(null)
      setMode('empty')
      return
    }

    setTranscript(spoken)
    setMode('structuring')
    try {
      const result = await structureBrewNote(spoken)
      setStructured(result)
      setMode('review')
    } catch (err) {
      if (err instanceof BrewEmptyError) {
        setMode('empty')
      } else if (
        err instanceof ClaudeNetworkError ||
        err instanceof ClaudeSchemaError
      ) {
        // No-loss fallback: hand the spoken note to the manual form so the
        // user's words are never discarded on a structuring failure (FR-020).
        setManualPrefill(spoken)
        setMode('manual')
      } else {
        setMode('error')
      }
    }
  }

  if (mode === 'review' && structured) {
    return (
      <BrewReview
        coffeeId={coffeeId}
        structured={structured}
        transcript={transcript}
        onSaved={onSaved}
        onCancel={onClose}
      />
    )
  }

  if (mode === 'manual') {
    return (
      <BrewEntryForm
        coffeeId={coffeeId}
        initialTastingNote={manualPrefill}
        onSaved={onSaved}
        onCancel={onClose}
      />
    )
  }

  return (
    <div
      style={{
        padding: 'var(--space-4)',
        maxWidth: 430,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      {(mode === 'idle' || mode === 'listening' || mode === 'structuring') && (
        <>
          <button
            type="button"
            className="primary"
            onClick={() => void handleRecord()}
            disabled={mode === 'listening' || mode === 'structuring'}
            style={{
              width: '100%',
              minHeight: 56,
              fontSize: 'var(--font-size-lg)',
            }}
          >
            {mode === 'idle' && 'Record brew'}
            {mode === 'listening' && 'Listening…'}
            {mode === 'structuring' && 'Sorting it out…'}
          </button>
          {mode === 'idle' && (
            <>
              <button
                type="button"
                onClick={() => setMode('manual')}
                style={{ marginTop: 'var(--space-3)', width: '100%' }}
              >
                Enter by hand
              </button>
              <button
                type="button"
                onClick={onClose}
                style={{ marginTop: 'var(--space-3)', width: '100%' }}
              >
                Cancel
              </button>
            </>
          )}
        </>
      )}

      {mode === 'empty' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Didn&apos;t catch that — try again, or enter it by hand.
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => void handleRecord()}
            style={{ width: '100%' }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            style={{ width: '100%' }}
          >
            Enter by hand
          </button>
          <button type="button" onClick={onClose} style={{ width: '100%' }}>
            Cancel
          </button>
        </div>
      )}

      {mode === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            Something went wrong capturing that brew.
          </p>
          <button
            type="button"
            className="primary"
            onClick={() => void handleRecord()}
            style={{ width: '100%' }}
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            style={{ width: '100%' }}
          >
            Enter by hand
          </button>
          <button type="button" onClick={onClose} style={{ width: '100%' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
