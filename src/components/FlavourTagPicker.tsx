import {
  FLAVOUR_TAGS,
  FLAVOUR_LABELS,
  MAX_FLAVOUR_TAGS,
  type FlavourTag,
} from '@/lib/flavours'

interface FlavourTagPickerProps {
  value: FlavourTag[]
  onChange: (value: FlavourTag[]) => void
}

/** Single-tap flavour palette; selection is capped at MAX_FLAVOUR_TAGS. */
export function FlavourTagPicker({ value, onChange }: FlavourTagPickerProps) {
  const atLimit = value.length >= MAX_FLAVOUR_TAGS

  function toggle(tag: FlavourTag): void {
    if (value.includes(tag)) {
      onChange(value.filter(t => t !== tag))
    } else if (!atLimit) {
      onChange([...value, tag])
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
        {FLAVOUR_TAGS.map(tag => {
          const selected = value.includes(tag)
          const disabled = !selected && atLimit
          return (
            <button
              type="button"
              key={tag}
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => toggle(tag)}
              style={{
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                fontSize: '0.7rem',
                padding: 'var(--space-2) var(--space-3)',
                minHeight: 'var(--touch-target-min)',
                borderRadius: 999,
                border: selected
                  ? '0.5px solid var(--color-accent)'
                  : '0.5px solid var(--color-border-primary)',
                background: selected
                  ? 'var(--color-accent)'
                  : 'transparent',
                color: selected
                  ? 'var(--color-bg-primary)'
                  : 'var(--color-text-primary)',
              }}
            >
              {FLAVOUR_LABELS[tag]}
            </button>
          )
        })}
      </div>
      <p
        style={{
          margin: 'var(--space-2) 0 0',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)',
        }}
      >
        {value.length}/{MAX_FLAVOUR_TAGS} selected
        {atLimit ? ' · max reached' : ''}
      </p>
    </div>
  )
}
