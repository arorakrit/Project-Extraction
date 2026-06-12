import { useEffect, useRef, useState } from 'react'
import {
  structureDrinkNote,
  DrinkDraftEmptyError,
  MissingApiKeyError,
} from '@/ai/client'
import {
  startTranscription,
  isSpeechRecognitionAvailable,
  SpeechRecognitionFailedError,
  type TranscriptionSession,
} from '@/lib/speech'
import type { VoiceDrinkDraft } from '@/ai/schemas/drink'

/** Map a SpeechRecognition error code to a user-facing reason (FR-014). */
function speechErrorMessage(code: string | null): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access is blocked. Allow it in your browser’s site settings, or log it by hand below.'
    case 'audio-capture':
      return 'No microphone was found. Log it by hand below instead.'
    case 'network':
      return 'Speech recognition needs an internet connection. Try again, or log it by hand below.'
    case 'no-speech':
      return 'Didn’t hear anything. Try again, or log it by hand below.'
    default:
      return 'Something went wrong capturing that drink.'
  }
}

interface DrinkRecorderProps {
  /** Called with the validated, normalized draft; the form below becomes the review surface (FR-012). */
  onDraft: (draft: VoiceDrinkDraft) => void
}

type Mode = 'idle' | 'listening' | 'structuring' | 'error'

/**
 * Voice entry point for drink logging (006 FR-009). Lives ABOVE the café-first
 * form on #/log: a successful capture hands the draft up via onDraft; every
 * failure state keeps the manual form below fully usable, and a structuring
 * failure keeps the transcript visible so nothing spoken is lost
 * (Principle IV, research D8). Unmounting mid-capture stops recognition and
 * discards everything — no partial entries.
 */
export function DrinkRecorder({ onDraft }: DrinkRecorderProps) {
  const available = isSpeechRecognitionAvailable()
  const [mode, setMode] = useState<Mode>('idle')
  const [interim, setInterim] = useState('')
  const [transcript, setTranscript] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const sessionRef = useRef<TranscriptionSession | null>(null)

  // Navigation away mid-dictation: stop the session; the discarded promise
  // resolves into an unmounted component (spec edge case — no partial entry).
  useEffect(() => () => sessionRef.current?.stop(), [])

  async function handleRecord(): Promise<void> {
    setInterim('')
    setTranscript(null)
    setMode('listening')
    let spoken: string
    try {
      const session = startTranscription({ onInterim: setInterim })
      sessionRef.current = session
      spoken = await session.done
    } catch (err) {
      console.error('[DrinkRecorder] speech recognition failed:', err)
      setErrorMessage(
        speechErrorMessage(
          err instanceof SpeechRecognitionFailedError ? err.code : null,
        ),
      )
      setMode('error')
      return
    } finally {
      sessionRef.current = null
    }

    // Empty/whitespace transcript: short-circuit to "didn't catch that"
    // without spending a Claude call.
    if (spoken.trim() === '') {
      setTranscript(null)
      setErrorMessage('Didn’t catch that — try again, or log it by hand below.')
      setMode('error')
      return
    }

    setTranscript(spoken)
    setMode('structuring')
    try {
      const draft = await structureDrinkNote(spoken)
      setMode('idle')
      onDraft(draft)
    } catch (err) {
      // Transcript stays on screen in every failure branch — retry or copy it
      // into the form by hand; nothing spoken is lost (FR-016, Principle IV).
      if (err instanceof DrinkDraftEmptyError) {
        setErrorMessage(err.message)
      } else if (err instanceof MissingApiKeyError) {
        setErrorMessage(err.message)
      } else {
        console.error('[DrinkRecorder] structuring failed:', err)
        setErrorMessage(
          'Couldn’t make sense of that right now — check your connection and try again, or log it by hand below.',
        )
      }
      setMode('error')
    }
  }

  function handleStop(): void {
    sessionRef.current?.stop()
  }

  if (!available) {
    return (
      <p
        style={{
          margin: '0 0 var(--space-4)',
          padding: 'var(--space-3)',
          border: '0.5px solid var(--color-border-tertiary)',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
        }}
      >
        Voice logging isn’t supported in this browser — log your drink below.
      </p>
    )
  }

  return (
    <div style={{ marginBottom: 'var(--space-4)', textAlign: 'center' }}>
      {mode === 'idle' && (
        <button
          type="button"
          className="primary"
          aria-label="Log by voice"
          onClick={() => void handleRecord()}
          style={{ width: '100%', minHeight: 56, fontSize: 'var(--font-size-lg)' }}
        >
          🎙 Log by voice
        </button>
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
            {interim || 'Listening… say the café, drink, stars, and flavours, then tap Stop.'}
          </p>
        </>
      )}

      {mode === 'structuring' && (
        <>
          <button
            type="button"
            className="primary"
            disabled
            style={{ width: '100%', minHeight: 56, fontSize: 'var(--font-size-lg)' }}
          >
            Sorting it out…
          </button>
          {transcript && (
            <p
              style={{
                margin: 'var(--space-3) 0 0',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              “{transcript}”
            </p>
          )}
        </>
      )}

      {mode === 'error' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
            {errorMessage}
          </p>
          {transcript && (
            <p
              style={{
                margin: 0,
                color: 'var(--color-text-primary)',
                fontSize: 'var(--font-size-sm)',
              }}
            >
              You said: “{transcript}”
            </p>
          )}
          <button
            type="button"
            className="primary"
            onClick={() => void handleRecord()}
            style={{ width: '100%' }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
