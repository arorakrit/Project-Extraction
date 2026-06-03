type SpeechRecognitionCtor = new () => SpeechRecognition

/** Resolve the vendor-prefixed constructor; isolated here so it is stubbable. */
function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function isSpeechRecognitionAvailable(): boolean {
  return getRecognitionCtor() !== null
}

export class SpeechUnavailableError extends Error {
  constructor() {
    super('Speech recognition is not available in this browser.')
    this.name = 'SpeechUnavailableError'
  }
}

export class SpeechRecognitionFailedError extends Error {
  public readonly code: string
  constructor(code: string) {
    super(`Speech recognition failed: ${code}`)
    this.name = 'SpeechRecognitionFailedError'
    this.code = code
  }
}

export interface TranscriptionSession {
  /** Resolves with the final transcript once recognition ends (user stop or device end). */
  readonly done: Promise<string>
  /** Finalize capture. Safe to call more than once. */
  stop: () => void
}

/**
 * Begin a continuous recognition session the caller stops explicitly.
 *
 * Continuous mode keeps listening through natural pauses (a non-continuous
 * session ends at the first pause and truncates the note). The session runs
 * until the user taps stop — there is no silence timer guessing when they are
 * done. `onInterim` streams the best-so-far transcript so the UI can show what
 * is being heard. `done` resolves with the finalized transcript (SC-001).
 *
 * `done` rejects with SpeechUnavailableError when the API is absent, or
 * SpeechRecognitionFailedError on a recognition error (e.g. denied mic).
 */
export function startTranscription(options?: {
  onInterim?: (text: string) => void
}): TranscriptionSession {
  const Ctor = getRecognitionCtor()
  if (!Ctor) {
    return { done: Promise.reject(new SpeechUnavailableError()), stop: () => {} }
  }

  const recognition = new Ctor()
  recognition.lang = 'en-US'
  recognition.continuous = true
  recognition.interimResults = true
  recognition.maxAlternatives = 1

  let settled = false
  let transcript = ''
  let resolveDone!: (value: string) => void
  let rejectDone!: (reason: unknown) => void
  const done = new Promise<string>((resolve, reject) => {
    resolveDone = resolve
    rejectDone = reject
  })

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interim = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (!result) continue
      const alternative = result[0]
      if (!alternative) continue
      if (result.isFinal) transcript += alternative.transcript
      else interim += alternative.transcript
    }
    options?.onInterim?.((transcript + interim).trim())
  }

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (settled) return
    const code = event.error ?? 'unknown'
    // A 'no-speech' tail after we already captured words isn't a failure.
    if (code === 'no-speech' && transcript.trim() !== '') {
      settled = true
      resolveDone(transcript.trim())
      return
    }
    settled = true
    rejectDone(new SpeechRecognitionFailedError(code))
  }

  recognition.onend = () => {
    if (settled) return
    settled = true
    resolveDone(transcript.trim())
  }

  recognition.start()

  return {
    done,
    stop: () => {
      try {
        recognition.stop()
      } catch {
        // Already stopped; onend will settle `done`.
      }
    },
  }
}
