import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DrinkLogForm } from '@/components/DrinkLogForm'
import type { DrinkInput } from '@/store/drinks'

afterEach(cleanup)

async function renderForm() {
  const onSubmit = vi.fn<(input: DrinkInput) => void>()
  const onCancel = vi.fn()
  render(<DrinkLogForm onSubmit={onSubmit} onCancel={onCancel} />)
  // Flush the async listVenues() load that runs on mount.
  await screen.findByRole('button', { name: 'Save' })
  return { onSubmit, onCancel }
}

describe('DrinkLogForm', () => {
  it('U-01: Save is blocked until a rating is selected, and writes nothing', async () => {
    const { onSubmit } = await renderForm()
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()

    fireEvent.click(save)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('U-04: a rating-only save succeeds', async () => {
    const { onSubmit } = await renderForm()
    fireEvent.click(screen.getByRole('radio', { name: '4 stars' }))

    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeEnabled()
    fireEvent.click(save)

    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ rating: 4 }))
  })

  it('US4: optional fields are passed through; rating-only still saves', async () => {
    const { onSubmit } = await renderForm()
    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }))
    fireEvent.change(screen.getByPlaceholderText('What are you drinking?'), {
      target: { value: 'Yirgacheffe' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Natural' }))
    fireEvent.click(screen.getByRole('button', { name: 'Light' }))

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 5,
        coffee_name: 'Yirgacheffe',
        process: 'natural',
        roast_level: 'light',
      }),
    )
  })
})
