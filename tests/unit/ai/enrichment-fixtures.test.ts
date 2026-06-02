import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { EnrichedCoffeeSchema } from '@/ai/schemas/enrichment'

const FIXTURES_DIR = join(process.cwd(), 'tests/ai-fixtures/enrichment')

interface Fixture {
  name: string
  recorded: { content: Array<{ type: string; name?: string; input?: unknown }> }
  expected: unknown
}

function loadFixtures(): Fixture[] {
  const entries = readdirSync(FIXTURES_DIR).filter(name => {
    const full = join(FIXTURES_DIR, name)
    try {
      return statSync(full).isDirectory()
    } catch {
      return false
    }
  })
  return entries.map(name => ({
    name,
    recorded: JSON.parse(
      readFileSync(join(FIXTURES_DIR, name, 'recorded-response.json'), 'utf8'),
    ),
    expected: JSON.parse(
      readFileSync(join(FIXTURES_DIR, name, 'expected-output.json'), 'utf8'),
    ),
  }))
}

describe('enrichment golden fixtures', () => {
  const fixtures = loadFixtures()

  if (fixtures.length === 0) {
    it.skip('no fixtures present — add one under tests/ai-fixtures/enrichment/<name>/', () => {})
    return
  }

  it.each(fixtures)(
    '$name: recorded response validates and equals expected output',
    ({ recorded, expected }) => {
      const toolUse = recorded.content.find(
        b => b.type === 'tool_use' && b.name === 'record_coffee_enrichment',
      )
      expect(toolUse, 'recorded-response.json must contain a tool_use block').toBeDefined()
      const parsed = EnrichedCoffeeSchema.parse(toolUse!.input)
      expect(parsed).toEqual(expected)
    },
  )
})
