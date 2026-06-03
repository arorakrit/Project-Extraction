import { useState } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { FlavourTagPicker } from '@/components/FlavourTagPicker'
import type { FlavourTag } from '@/lib/flavours'

afterEach(cleanup)

function Harness() {
  const [value, setValue] = useState<FlavourTag[]>([])
  return <FlavourTagPicker value={value} onChange={setValue} />
}

describe('FlavourTagPicker (U-02)', () => {
  it('selects on tap and deselects on re-tap', () => {
    render(<Harness />)
    const fruity = screen.getByRole('button', { name: 'Fruity' })

    fireEvent.click(fruity)
    expect(fruity).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(fruity)
    expect(fruity).toHaveAttribute('aria-pressed', 'false')
  })

  it('caps selection at three and refuses a fourth', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Fruity' }))
    fireEvent.click(screen.getByRole('button', { name: 'Floral' }))
    fireEvent.click(screen.getByRole('button', { name: 'Chocolatey' }))

    expect(screen.getByText(/3\/3 selected/)).toBeInTheDocument()

    const nutty = screen.getByRole('button', { name: 'Nutty' })
    expect(nutty).toBeDisabled()
    fireEvent.click(nutty)
    expect(nutty).toHaveAttribute('aria-pressed', 'false')

    // An already-selected tag can still be toggled off while at the limit.
    const fruity = screen.getByRole('button', { name: 'Fruity' })
    expect(fruity).toBeEnabled()
    fireEvent.click(fruity)
    expect(fruity).toHaveAttribute('aria-pressed', 'false')
  })
})
