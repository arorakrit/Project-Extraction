import type { CSSProperties } from 'react'
import type { StructuredBrew } from '@/ai/schemas/brew'
import { deriveRatio } from '@/lib/ratio'

interface BrewFieldsProps {
  value: StructuredBrew
  onChange: (next: StructuredBrew) => void
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 'var(--font-size-sm)',
  color: 'var(--color-text-secondary)',
  marginBottom: 'var(--space-1)',
}

const rowStyle: CSSProperties = {
  display: 'block',
  marginBottom: 'var(--space-3)',
}

/**
 * Shared editable view over a StructuredBrew. Pure presentational (controlled
 * value + onChange), reused by review (US1), manual entry (US3), and edit (US2).
 * The ratio is read-only and derived when both dose and water are present
 * (dose/water authoritative, FR-006); otherwise a directly-editable input.
 */
export function BrewFields({ value, onChange }: BrewFieldsProps) {
  function setText(key: 'brew_method' | 'grind' | 'tasting_note', raw: string): void {
    const trimmed = raw
    onChange({ ...value, [key]: trimmed === '' ? null : trimmed })
  }

  function setNum(
    key: 'dose_g' | 'water_g' | 'ratio' | 'water_temp_c' | 'total_time_s',
    raw: string,
  ): void {
    if (raw.trim() === '') {
      onChange({ ...value, [key]: null })
      return
    }
    const n = key === 'total_time_s' ? parseInt(raw, 10) : parseFloat(raw)
    if (Number.isNaN(n)) return
    onChange({ ...value, [key]: n })
  }

  const derivedRatio = deriveRatio(value.dose_g, value.water_g)
  const ratioIsDerived = derivedRatio !== null

  return (
    <div>
      <label style={rowStyle}>
        <span style={labelStyle}>Method</span>
        <input
          type="text"
          inputMode="text"
          placeholder="—"
          value={value.brew_method ?? ''}
          onChange={e => setText('brew_method', e.target.value)}
        />
      </label>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <label style={{ ...rowStyle, flex: 1 }}>
          <span style={labelStyle}>Dose (g)</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="—"
            value={value.dose_g ?? ''}
            onChange={e => setNum('dose_g', e.target.value)}
          />
        </label>
        <label style={{ ...rowStyle, flex: 1 }}>
          <span style={labelStyle}>Water (g)</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="—"
            value={value.water_g ?? ''}
            onChange={e => setNum('water_g', e.target.value)}
          />
        </label>
      </div>

      <label style={rowStyle}>
        <span style={labelStyle}>
          Ratio{ratioIsDerived ? ' (from dose & water)' : ''}
        </span>
        {ratioIsDerived ? (
          <div
            style={{
              minHeight: 'var(--touch-target-min)',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--color-text-primary)',
            }}
          >
            1:{derivedRatio}
          </div>
        ) : (
          <input
            type="number"
            inputMode="decimal"
            placeholder="—"
            value={value.ratio ?? ''}
            onChange={e => setNum('ratio', e.target.value)}
          />
        )}
      </label>

      <label style={rowStyle}>
        <span style={labelStyle}>Grind</span>
        <input
          type="text"
          inputMode="text"
          placeholder="—"
          value={value.grind ?? ''}
          onChange={e => setText('grind', e.target.value)}
        />
      </label>

      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <label style={{ ...rowStyle, flex: 1 }}>
          <span style={labelStyle}>Temp (°C)</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="—"
            value={value.water_temp_c ?? ''}
            onChange={e => setNum('water_temp_c', e.target.value)}
          />
        </label>
        <label style={{ ...rowStyle, flex: 1 }}>
          <span style={labelStyle}>Time (s)</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder="—"
            value={value.total_time_s ?? ''}
            onChange={e => setNum('total_time_s', e.target.value)}
          />
        </label>
      </div>

      <label style={rowStyle}>
        <span style={labelStyle}>Tasting note</span>
        <textarea
          placeholder="—"
          value={value.tasting_note ?? ''}
          onChange={e => setText('tasting_note', e.target.value)}
          rows={3}
          style={{ width: '100%', resize: 'vertical', minHeight: 'var(--touch-target-min)' }}
        />
      </label>
    </div>
  )
}
