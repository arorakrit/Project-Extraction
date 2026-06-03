import { useRef, useState } from 'react'
import { BrewReview } from '@/components/BrewReview'
import { BrewEntryForm } from '@/components/BrewEntryForm'
import {
  structureBrewNote,
  BrewEmptyError,
  ClaudeNetworkError,
  ClaudeSchemaError,
} from '@/ai/client'
import {
  startTranscription,
  isSpeechRecognitionAvailable,
  SpeechRecognitionFailedError,
  type TranscriptionSession,
} from '@/lib/speech'
import type { StructuredBrew } from '@/ai/schemas/brew'

/** Map a SpeechRecognition error code to a user-facing reason. */
function speechErrorMessage(code: string | null): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Allow it in your browser’s site settings, or enter by hand.'
    case 'audio-capture':
      return 'No microphone was found. Enter it by hand instead.'
    case 'network':
      return 'Speech recognition needs an internet connection. Try again, or enter by hand.'
    case 'no-speech':
      return 'Didn’t hear anything. Try again, or enter by hand.'
    default:
      return 'Something went wrong capturing that brew.'
  }
}

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
  const [errorReason, setErrorReason] = useState<string | null>(null)
  const [interim, setInterim] = useState('')
  const sessionRef = useRef<TranscriptionSession | null>(null)

  function handleStop(): void {
    sessionRef.current?.stop()
  }

  async function handleRecord(): Promise<void> {
    setInterim('')
    setMode('listening')
    let spoken: string
    try {
      const session = startTranscription({ onInterim: setInterim })
      sessionRef.current = session
      spoken = await session.done
    } catch (err) {
      console.error('[BrewRecorder] speech recognition failed:', err)
      setErrorReason(
        err instanceof SpeechRecognitionFailedError ? err.code : null,
      )
      setMode('error')
      return
    } finally {
      sessionRef.current = null
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
        console.error('[BrewRecorder] structuring failed:', err)
        setErrorReason(null)
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
      {mode === 'idle' && (
        <>
          <button
            type="button"
            className="primary"
            onClick={() => void handleRecord()}
            style={{ width: '100%', minHeight: 56, fontSize: 'var(--font-size-lg)' }}
          >
            Record brew
          </button>
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

      {mode === 'listening' && (
        <>
          <button
            type="button"
            className="primary"
            onClick={handleStop}
            style={{ width: '100%', minHeight: 56, fontSize: 'var(--font-size-lg)' }}
          >
            Stop
          </button>
          <p
            style={{
              margin: 'var(--space-3) 0 0',
              minHeight: '1.5em',
              color: interim
                ? 'var(--color-text-primary)'
                : 'var(--color-text-secondary)',
            }}
          >
            {interim || 'Listening… speak your brew, then tap Stop.'}
          </p>
        </>
      )}

      {mode === 'structuring' && (
        <button
          type="button"
          className="primary"
          disabled
          style={{ width: '100%', minHeight: 56, fontSize: 'var(--font-size-lg)' }}
        >
          Sorting it out…
        </button>
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
            {speechErrorMessage(errorReason)}
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
