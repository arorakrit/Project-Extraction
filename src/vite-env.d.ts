/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional built-in Anthropic key baked in at build time (005). Untracked
   * `.env` only — never committed. Read exclusively by src/lib/apiKey.ts.
   */
  readonly VITE_ANTHROPIC_KEY?: string
}
