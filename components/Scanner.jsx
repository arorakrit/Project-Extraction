import { useState, useRef } from 'react'
import { extractCoffeeMetadata, enrichCoffeeProfile } from '../lib/claude'

export default function Scanner({ onScanComplete }) {
  const [status, setStatus] = useState('idle') // idle | extracting | enriching | done | error
  const [error, setError] = useState(null)
  const inputRef = useRef()

  async function handleFile(file) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1]
      const type = file.type

      try {
        setError(null)
        setStatus('extracting')
        const metadata = await extractCoffeeMetadata(base64, type)

        setStatus('enriching')
        const enriched = await enrichCoffeeProfile(metadata)

        const coffee = {
          id: crypto.randomUUID(),
          scannedAt: new Date().toISOString(),
          imageUrl: e.target.result,
          metadata,
          enriched,
          logs: []
        }

        setStatus('done')
        onScanComplete(coffee)
      } catch (err) {
        setError(err.message)
        setStatus('error')
      }
    }
    reader.readAsDataURL(file)
  }

  const labels = {
    idle: 'Scan a bag',
    extracting: 'Reading the bag...',
    enriching: 'Researching the coffee...',
    done: 'Done',
    error: 'Try again'
  }

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => e.target.files[0] && handleFile(e.target.files[0])}
      />
      <button
        onClick={() => inputRef.current.click()}
        disabled={status === 'extracting' || status === 'enriching'}
        style={{ fontSize: '16px', padding: '12px 32px' }}
      >
        {labels[status]}
      </button>
      {status !== 'idle' && status !== 'done' && status !== 'error' && (
        <p style={{ marginTop: '12px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
          {labels[status]}
        </p>
      )}
      {error && (
        <p style={{ marginTop: '12px', fontSize: '14px', color: '#da291c' }}>
          {error}
        </p>
      )}
    </div>
  )
}
