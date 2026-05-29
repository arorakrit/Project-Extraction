import VoiceLogger from './VoiceLogger'

export default function CoffeeCard({ coffee, onAddLog }) {
  const { metadata, enriched, logs, imageUrl } = coffee

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1rem' }}>
      {imageUrl && <img src={imageUrl} alt="bag" style={{ width: '100%', borderRadius: '12px', marginBottom: '1rem' }} />}

      <h2 style={{ margin: '0 0 4px' }}>{metadata.coffee_name || 'Unknown coffee'}</h2>
      <p style={{ margin: '0 0 1rem', color: 'var(--color-text-secondary)' }}>
        {metadata.roaster_name} · {metadata.origin_country}
      </p>

      {metadata.tasting_notes?.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {metadata.tasting_notes.map(n => (
            <span key={n} style={{
              fontSize: '12px', padding: '4px 10px',
              background: 'var(--color-background-secondary)',
              borderRadius: '999px', border: '0.5px solid var(--color-border-tertiary)'
            }}>{n}</span>
          ))}
        </div>
      )}

      <div style={{ marginBottom: '1.5rem' }}>
        {[
          ['Process', metadata.process],
          ['Variety', metadata.variety],
          ['Roast', metadata.roast_level],
          ['Altitude', metadata.altitude_masl ? `${metadata.altitude_masl} masl` : null],
          ['Roasted', metadata.roast_date],
        ].filter(([, v]) => v).map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '0.5px solid var(--color-border-tertiary)', fontSize: '14px' }}>
            <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>

      {enriched?.origin_story && (
        <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }}>
          {enriched.origin_story}
        </p>
      )}

      {enriched?.brewing_recommendations && (
        <div style={{ background: 'var(--color-background-secondary)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem' }}>
          <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '500' }}>Brew guide</p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {enriched.brewing_recommendations.best_for?.join(', ')} · {enriched.brewing_recommendations.ratio_suggestion} · {enriched.brewing_recommendations.temperature_c}°C
          </p>
        </div>
      )}

      <h3 style={{ margin: '0 0 12px' }}>Your logs</h3>
      {logs.length === 0 && (
        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>No logs yet. Add your first below.</p>
      )}
      {logs.map((log, i) => (
        <div key={i} style={{ border: '0.5px solid var(--color-border-tertiary)', borderRadius: '12px', padding: '1rem', marginBottom: '8px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: '500' }}>
            {log.brew_method} {log.overall_rating ? `· ${log.overall_rating}/10` : ''}
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            {log.taste_notes?.join(', ')}
          </p>
          {log.personal_notes && <p style={{ margin: '4px 0 0', fontSize: '13px', fontStyle: 'italic' }}>{log.personal_notes}</p>}
        </div>
      ))}

      <VoiceLogger onLogComplete={(log) => onAddLog(coffee.id, log)} />
    </div>
  )
}
