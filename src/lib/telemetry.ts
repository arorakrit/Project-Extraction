export interface TelemetryRecord {
  call: 'extract_coffee_label' | 'enrich_coffee_profile'
  model_id: 'claude-sonnet-4-6'
  status: 'ok' | 'retry_then_ok' | 'schema_error' | 'network_error'
  latency_ms: number
  input_image_bytes: number | null
  output_tokens: number | null
  retried: boolean
  ts: string
}

const RING_CAPACITY = 100
const ring: TelemetryRecord[] = []

export function record(entry: TelemetryRecord): void {
  ring.push(entry)
  if (ring.length > RING_CAPACITY) ring.shift()
}

export function getSession(): readonly TelemetryRecord[] {
  return ring.slice()
}

export function aggregateTokens(): {
  input_image_bytes: number
  output_tokens: number
  calls: number
} {
  let bytes = 0
  let tokens = 0
  for (const r of ring) {
    bytes += r.input_image_bytes ?? 0
    tokens += r.output_tokens ?? 0
  }
  return { input_image_bytes: bytes, output_tokens: tokens, calls: ring.length }
}

export function __resetForTests(): void {
  ring.length = 0
}

declare global {
  interface Window {
    __telemetry?: {
      session: typeof getSession
      aggregate: typeof aggregateTokens
    }
  }
}

if (typeof window !== 'undefined') {
  window.__telemetry = {
    session: getSession,
    aggregate: aggregateTokens,
  }
}
