import type { Rating } from '@/store/drinks'

interface StarRatingProps {
  value: Rating | null
  onChange: (value: Rating) => void
}

const STARS: Rating[] = [1, 2, 3, 4, 5]

/** 1–5 single-tap star control. `null` means no rating chosen yet. */
export function StarRating({ value, onChange }: StarRatingProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Rating"
      style={{ display: 'flex', gap: 'var(--space-1)' }}
    >
      {STARS.map(star => {
        const filled = value !== null && star <= value
        return (
          <button
            type="button"
            key={star}
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            onClick={() => onChange(star)}
            style={{
              minWidth: 'var(--touch-target-min)',
              minHeight: 'var(--touch-target-min)',
              fontSize: 'var(--font-size-xl)',
              lineHeight: 1,
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: filled
                ? 'var(--color-accent)'
                : 'var(--color-text-tertiary)',
            }}
          >
            {filled ? '★' : '☆'}
          </button>
        )
      })}
    </div>
  )
}
