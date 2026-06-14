import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Settings } from '@/components/Settings'
import { getDB } from '@/store/db'
import { setApiKey } from '@/store/settings'

const BUILT_IN_KEY = 'sk-ant-built-in-secret'
const BUILT_IN_NOTICE = /this build includes a built-in key/i
const TODAYS_COPY = /your key is stored locally on this device only/i

describe('Settings key-source indicator (005)', () => {
  beforeEach(async () => {
    const db = await getDB()
    await db.clear('settings')
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllEnvs()
  })

  it('shows the built-in notice when only the built-in key is active (US1)', async () => {
    vi.stubEnv('VITE_ANTHROPIC_KEY', BUILT_IN_KEY)
    render(<Settings />)

    expect(await screen.findByText(BUILT_IN_NOTICE)).toBeInTheDocument()
    // No personal key → no "(saved …)" hint and no Clear button.
    expect(screen.queryByText(/saved — paste again to overwrite/i)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('never renders the built-in key value anywhere in the DOM (US1, FR-005)', async () => {
    vi.stubEnv('VITE_ANTHROPIC_KEY', BUILT_IN_KEY)
    const { container } = render(<Settings />)

    await screen.findByText(BUILT_IN_NOTICE)
    expect(container.innerHTML).not.toContain(BUILT_IN_KEY)
  })

  it('saving a personal key switches the indicator to personal (US2, FR-003)', async () => {
    vi.stubEnv('VITE_ANTHROPIC_KEY', BUILT_IN_KEY)
    render(<Settings />)
    await screen.findByText(BUILT_IN_NOTICE)

    fireEvent.change(screen.getByLabelText(/anthropic api key/i), {
      target: { value: 'sk-ant-my-own' },
    })
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }).closest('form')!)

    expect(
      await screen.findByText(/saved — paste again to overwrite/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(BUILT_IN_NOTICE)).toBeNull()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })

  it('clearing the personal key reverts to the built-in key (US2, FR-004)', async () => {
    vi.stubEnv('VITE_ANTHROPIC_KEY', BUILT_IN_KEY)
    await setApiKey('sk-ant-my-own')
    render(<Settings />)

    fireEvent.click(await screen.findByRole('button', { name: 'Clear' }))

    expect(await screen.findByText(BUILT_IN_NOTICE)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('renders today’s copy with no built-in mention when no key exists (US3, FR-006)', async () => {
    render(<Settings />)

    expect(screen.getByText(TODAYS_COPY)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText(BUILT_IN_NOTICE)).toBeNull(),
    )
    expect(screen.queryByText(/saved — paste again to overwrite/i)).toBeNull()
  })

  it('treats a blank built-in key as absent (US3, FR-009)', async () => {
    vi.stubEnv('VITE_ANTHROPIC_KEY', '   ')
    render(<Settings />)

    expect(screen.getByText(TODAYS_COPY)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByText(BUILT_IN_NOTICE)).toBeNull(),
    )
  })

  it('clearing with no built-in key returns to the no-key state (US3, FR-004)', async () => {
    await setApiKey('sk-ant-my-own')
    render(<Settings />)

    fireEvent.click(await screen.findByRole('button', { name: 'Clear' }))

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull(),
    )
    expect(screen.queryByText(BUILT_IN_NOTICE)).toBeNull()
    expect(screen.getByText(TODAYS_COPY)).toBeInTheDocument()
  })
})
