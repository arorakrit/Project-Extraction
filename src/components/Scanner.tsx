import { useRef, type ChangeEvent } from 'react'

interface ScannerProps {
  status: 'idle' | 'extracting'
  onCapture: (dataUrl: string) => void
  onManualEntry: () => void
}

const STATUS_LABELS: Record<ScannerProps['status'], string> = {
  idle: 'Scan a bag',
  extracting: 'Reading the bag…',
}

export function Scanner({ status, onCapture, onManualEntry }: ScannerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await fileToDataUrl(file)
    onCapture(dataUrl)
    // Allow re-selecting the same file in the same session.
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-4)',
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        disabled={status === 'extracting'}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        className="primary"
        onClick={() => inputRef.current?.click()}
        disabled={status === 'extracting'}
        style={{
          minHeight: 64,
          minWidth: 220,
          fontSize: 'var(--font-size-lg)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        {STATUS_LABELS[status]}
      </button>
      {status === 'extracting' && (
        <p
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            margin: 0,
          }}
        >
          This usually takes 5–10 seconds.
        </p>
      )}
      <button
        type="button"
        onClick={onManualEntry}
        disabled={status === 'extracting'}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-sm)',
          textDecoration: 'underline',
          minHeight: 'var(--touch-target-min)',
        }}
      >
        Or enter a coffee manually
      </button>
    </div>
  )
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
