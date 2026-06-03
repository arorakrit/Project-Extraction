# Phase 1 Data Model: Cup'd Brand UI Refactor

This feature touches **no domain data** — no IndexedDB stores, records, or AI schemas change. The
"model" here is the **design-token set**: the structured, named definitions that drive the brand
uniformly (FR-014). They live in `style.css` `:root` and are consumed everywhere via `var(--…)`.

## Token: Colour palette ("Cupping Room After Dark")

| Token (semantic)         | Brand role | Value | Usage |
|--------------------------|------------|-------|-------|
| `--color-bg-primary`     | Ink        | `#121311` | App base background |
| `--color-bg-secondary`   | Slate      | `#232621` | Cards / elevated surfaces |
| `--color-ink-2`          | Ink-2      | `#1A1C18` | Deep insets, card metas |
| `--color-text-primary`   | Bone       | `#E9E7DD` | Primary text, headings |
| `--color-text-secondary` | Bone-dim   | `#9A9C92` | Secondary / meta text |
| `--color-text-tertiary`  | Bone-dimmer| `#6E7066` | Disabled / faint labels |
| `--color-accent`         | Jade       | `#3DBE8B` | Signature accent — use sparingly |
| `--color-accent-dim`     | Jade-dim   | `#2C8C66` | Accent pressed/secondary |
| `--color-clay`           | Clay       | `#C8643C` | Reserved; NOT the accent (held) |
| `--color-border-primary` | Line       | `rgba(233,231,221,0.10)` | Dividers, input borders |
| `--color-border-tertiary`| Line-2     | `rgba(233,231,221,0.06)` | Subtle separators |
| `--color-error`          | (kept)     | `#da291c` | Error states |

**Rule**: Jade is an accent, not a surface — used for the wordmark apostrophe, primary actions,
selected/active states, the card edge, and data emphasis. It must not dominate a screen.

## Token: Typeface roles

| Token            | Face | Source | Role |
|------------------|------|--------|------|
| `--font-display` | Bricolage Grotesque (var) | bundled `@fontsource-variable` | Wordmark, page titles, coffee names |
| `--font-body`    | Hanken Grotesk (var)      | bundled `@fontsource-variable` | Body copy, UI text (global `body` default) |
| `--font-mono`    | JetBrains Mono (var)      | bundled `@fontsource-variable` | All data: ratings, ratios, temps, tags, timestamps |

Each token includes a system fallback stack and is loaded with `font-display: swap` so first paint
is never blocked.

## Token: Existing sizing/spacing (unchanged)

`--touch-target-min: 44px`, `--space-1..8`, `--font-size-sm..xl`, `--radius-md/lg` are retained
as-is — the mobile-first contract (Principle III) is preserved, not redefined.

## Utility classes (brand patterns)

| Class           | Definition (intent) |
|-----------------|---------------------|
| `.font-display` | `font-family: var(--font-display)` — apply to headings & coffee names |
| `.data`         | `font-family: var(--font-mono)` + letter-spacing — apply to numeric/data nodes |
| `.tag`          | mono, uppercase, pill (border + radius:100px) — flavour tags & data chips |
| `.card`         | slate surface, radius, padding, border — the standard surface |
| `.card--accent` | adds the 3px jade left edge — the brand "log card" |
| `button.primary`| (kept) now jade-forward primary action |

## Card anatomy (the brand "log card")

A reusable structure applied to drink/coffee/brew cards:

```text
.card.card--accent
├── top row:   venue (mono + location marker)        ·  timestamp (mono)
├── coffee name (.font-display, ~1.5rem)
├── roaster · origin · process (body, bone-dim)
├── rating (.data): "4.5" jade + "/ 5.0" dimmed
├── tags:     .tag pills (mono, uppercase)
└── [optional community/footer line]
```

## What does NOT change

- No IndexedDB store, index, record shape, or `schema_version`.
- No Claude call, prompt, AI schema, or `tests/ai-fixtures/`.
- No routing, navigation structure, or feature behaviour — only the look, type, and voice of the
  existing surfaces.
