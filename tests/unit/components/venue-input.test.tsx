import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { VenueInput } from '@/components/VenueInput'

afterEach(cleanup)

function Harness({ suggestions }: { suggestions: string[] }) {
  const [value, setValue] = useState('')
  return (
    <VenueInput value={value} onChange={setValue} suggestions={suggestions} />
  )
}

function optionValues(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('option')).map(o => o.value)
}

describe('VenueInput (U-03)', () => {
  it('filters suggestions by the typed prefix', () => {
    const { container } = render(
      <Harness suggestions={['WoC Brussels', 'Cafe A', 'Roaster Stand']} />,
    )
    const input = screen.getByRole('combobox', { name: 'Venue' })

    expect(optionValues(container)).toHaveLength(3)

    fireEvent.change(input, { target: { value: 'woc' } })
    expect(optionValues(container)).toEqual(['WoC Brussels'])
  })

  it('accepts a free-typed value that is not in the suggestion list', () => {
    render(<Harness suggestions={['Cafe A']} />)
    const input = screen.getByRole('combobox', { name: 'Venue' }) as HTMLInputElement

    fireEvent.change(input, { target: { value: 'Brand New Place' } })
    expect(input.value).toBe('Brand New Place')
  })
})
