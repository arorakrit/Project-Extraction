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

/**
 * Run a single recognition session and resolve with the best transcript.
 * Rejects with SpeechUnavailableError when the API is absent, or
 * SpeechRecognitionFailedError on a recognition error (e.g. denied mic).
 */
export function transcribeOnce(): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      reject(new SpeechUnavailableError())
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    let settled = false
    let transcript = ''

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const alternative = event.results[0]?.[0]
      transcript = alternative?.transcript ?? ''
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (settled) return
      settled = true
      reject(new SpeechRecognitionFailedError(event.error ?? 'unknown'))
    }

    recognition.onend = () => {
      if (settled) return
      settled = true
      resolve(transcript.trim())
    }

    recognition.start()
  })
}
