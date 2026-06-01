interface ErrorStateProps {
  reason: 'no_text' | 'network' | 'schema'
  onRetry: () => void
  onManualEntry: () => void
}

const MESSAGES: Record<ErrorStateProps['reason'], { headline: string; detail: string }> = {
  no_text: {
    headline: "Couldn't read the label",
    detail: 'Try a clearer photo, or enter the coffee manually.',
  },
  schema: {
    headline: "Couldn't read the label",
    detail: 'Try a clearer photo, or enter the coffee manually.',
  },
  network: {
    headline: "Couldn't reach Claude",
    detail: 'Check your connection and try again, or enter the coffee manually.',
  },
}

export function ErrorState({ reason, onRetry, onManualEntry }: ErrorStateProps) {
  const { headline, detail } = MESSAGES[reason]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        padding: 'var(--space-8) var(--space-4)',
        gap: 'var(--space-3)',
        maxWidth: 430,
        margin: '0 auto',
      }}
    >
      <h2 style={{ fontSize: 'var(--font-size-lg)', margin: 0 }}>{headline}</h2>
      <p
        style={{
          margin: 0,
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-base)',
        }}
      >
        {detail}
      </p>
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-2)',
          flexDirection: 'column',
          width: '100%',
          marginTop: 'var(--space-4)',
        }}
      >
        <button type="button" className="primary" onClick={onRetry}>
          Try another photo
        </button>
        <button type="button" onClick={onManualEntry}>
          Enter manually
        </button>
      </div>
    </div>
  )
}
