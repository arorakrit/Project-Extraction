import { useState, useRef } from 'react'
import { structureVoiceLog } from '../lib/claude'

export default function VoiceLogger({ onLogComplete }) {
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  function startRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return alert('Speech recognition not supported in this browser')

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (e) => {
      const full = Array.from(e.results).map(r => r[0].transcript).join(' ')
      setTranscript(full)
    }

    recognition.start()
    recognitionRef.current = recognition
    setRecording(true)
  }

  async function stopAndStructure() {
    recognitionRef.current?.stop()
    setRecording(false)
    setProcessing(true)
    setError(null)

    try {
      const structured = await structureVoiceLog(transcript)
      onLogComplete({ ...structured, rawTranscript: transcript, loggedAt: new Date().toISOString() })
      setTranscript('')
    } catch (err) {
      setError(err.message)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={{ padding: '1rem' }}>
      {transcript && (
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '12px', fontStyle: 'italic' }}>
          "{transcript}"
        </p>
      )}
      {error && (
        <p style={{ fontSize: '14px', color: '#da291c', marginBottom: '12px' }}>
          {error}
        </p>
      )}
      {!recording ? (
        <button onClick={startRecording} style={{ marginRight: '8px' }}>
          Start voice log
        </button>
      ) : (
        <button onClick={stopAndStructure} disabled={processing}>
          {processing ? 'Structuring...' : 'Stop & save'}
        </button>
      )}
    </div>
  )
}
