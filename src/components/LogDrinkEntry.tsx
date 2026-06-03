interface LogDrinkEntryProps {
  onClick: () => void
}

/**
 * Home-screen entry point into the manual drink-logging flow (FR-001).
 * Sits below the bag scanner on the idle home surface.
 */
export function LogDrinkEntry({ onClick }: LogDrinkEntryProps) {
  return (
    <div
      style={{
        padding: '0 var(--space-4) var(--space-8)',
        textAlign: 'center',
      }}
    >
      <p
        style={{
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
          margin: '0 0 var(--space-3)',
        }}
      >
        At a café or event?
      </p>
      <button
        type="button"
        onClick={onClick}
        style={{
          minHeight: 'var(--touch-target-min)',
          minWidth: 220,
          fontSize: 'var(--font-size-lg)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        Log a drink
      </button>
    </div>
  )
}
