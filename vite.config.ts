import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: false,
    include: ['tests/**/*.test.{ts,tsx}'],
    env: {
      // Vite auto-loads the developer's local .env into the test run; a real
      // VITE_ANTHROPIC_KEY there would make key-resolution tests (005)
      // environment-dependent. Blank ≡ absent per FR-009; vi.stubEnv still
      // overrides per-test.
      VITE_ANTHROPIC_KEY: '',
    },
  },
})
