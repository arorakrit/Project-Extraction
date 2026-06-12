import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { DrinkLogForm } from '@/components/DrinkLogForm'
import type { DrinkInput } from '@/store/drinks'

afterEach(cleanup)

async function renderForm(initial?: Partial<DrinkInput>) {
  const onSubmit = vi.fn<(input: DrinkInput) => void>()
  const onCancel = vi.fn()
  render(<DrinkLogForm onSubmit={onSubmit} onCancel={onCancel} initial={initial} />)
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

  it('US4: detail fields pass through after expanding; rating-only still saves', async () => {
    const { onSubmit } = await renderForm()
    fireEvent.click(screen.getByRole('radio', { name: '5 stars' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Add drink details' }))
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

  // --- 006 café-first re-orientation ---

  it('C-01: the café field renders before the rating (FR-001)', async () => {
    await renderForm()
    const venue = screen.getByLabelText('Venue')
    const ratingLabel = screen.getByText('Rating (required)')
    expect(
      venue.compareDocumentPosition(ratingLabel) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it('C-02: drink details are collapsed by default and expand on demand (FR-002)', async () => {
    await renderForm()
    // Hidden by default — none of the four detail fields are in the document.
    expect(screen.queryByPlaceholderText('What are you drinking?')).toBeNull()
    expect(screen.queryByText('Origin country')).toBeNull()
    expect(screen.queryByText('Process')).toBeNull()
    expect(screen.queryByText('Roast')).toBeNull()

    const toggle = screen.getByRole('button', { name: '+ Add drink details' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByPlaceholderText('What are you drinking?')).toBeInTheDocument()
    expect(screen.getByText('Origin country')).toBeInTheDocument()
    expect(screen.getByText('Process')).toBeInTheDocument()
    expect(screen.getByText('Roast')).toBeInTheDocument()
  })

  it('C-03: initial draft prefills editable fields and auto-expands seeded details (FR-012)', async () => {
    const { onSubmit } = await renderForm({
      venue: 'Sunday’s Coffee',
      coffee_name: 'oat flat white',
      rating: 4,
      flavour_tags: ['fruity', 'bright'],
    })

    // Seeded values render…
    expect(screen.getByLabelText('Venue')).toHaveValue('Sunday’s Coffee')
    // …including the detail-field coffee name, which auto-expands its section.
    expect(screen.getByPlaceholderText('What are you drinking?')).toHaveValue(
      'oat flat white',
    )
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked()

    // …and stay editable: change the venue, then save.
    fireEvent.change(screen.getByLabelText('Venue'), {
      target: { value: 'Blue Bottle' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 4,
        venue: 'Blue Bottle',
        coffee_name: 'oat flat white',
        flavour_tags: ['fruity', 'bright'],
      }),
    )
  })

  it('C-04: a draft without a rating leaves Save disabled (FR-013)', async () => {
    const { onSubmit } = await renderForm({
      venue: 'Sunday’s Coffee',
      flavour_tags: ['fruity'],
    })
    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    fireEvent.click(save)
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
