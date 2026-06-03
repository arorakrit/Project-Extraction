# Phase 0 Research: Cup'd Brand UI Refactor

The stack is fixed by the constitution and the brand is fully specified by `cupd-brand-board.html`,
so there are **no open technology unknowns** and **no `[NEEDS CLARIFICATION]` markers**. The
decisions below are design choices made within the fixed stack, recorded for lineage.

---

## D1. Token-first refactor through `style.css`

- **Decision**: Treat `style.css` as the single source of brand truth. Redefine the existing
  `--color-*` tokens to the Cupping Room After Dark values, add `--font-display` / `--font-body` /
  `--font-mono` tokens, and add a few brand utility classes (`.font-display`, `.data`, `.tag`,
  `.card`, `.card--accent`). Components keep reading tokens.
- **Rationale**: A grep confirms **no** component hardcodes a hex colour or `font-family` — every
  surface already consumes `var(--color-*)`, `var(--space-*)`, `var(--font-size-*)`. Redefining the
  token values therefore re-skins the whole app in one place and directly satisfies FR-014 (one
  shared definition, no off-brand legacy values). It also minimises diff size and regression risk.
- **Alternatives considered**:
  - *Per-component restyle with literal colours/fonts* — rejected: massive diff, guaranteed drift,
    violates FR-014.
  - *A CSS-in-JS theme provider* — rejected: introduces a dependency/architecture the app does not
    use; the existing token layer already does the job.

## D2. Mapping the brand palette onto existing token names

- **Decision**: Re-point the current semantic tokens to brand values (dark identity):
  `--color-bg-primary` -> Ink `#121311`; `--color-bg-secondary` -> Slate `#232621`;
  `--color-text-primary` -> Bone `#E9E7DD`; `--color-text-secondary` -> Bone-dim `#9A9C92`;
  `--color-text-tertiary` -> a dimmer bone; `--color-accent` -> Jade `#3DBE8B`; borders -> the
  brand's translucent bone lines (`rgba(233,231,221,0.10)` / `0.06`). Add `--color-ink-2 #1A1C18`,
  `--color-jade-dim #2C8C66`, `--color-clay #C8643C` (reserved, not used as the accent).
- **Rationale**: Reusing the existing semantic names means components need no rename; only values
  change. Keeping the brand board's exact hexes preserves the intended look.
- **Alternatives considered**:
  - *Introduce brand-named tokens (`--ink`, `--jade`, …) and rewrite every reference* — rejected:
    unnecessary churn; semantic names already exist and are correct.

## D3. Dark-only theme

- **Decision**: Ship a single dark theme. Remove the `@media (prefers-color-scheme: dark)` override
  block from `style.css` (the `:root` values become the dark identity) and set the
  `index.html` `theme-color` to Ink `#121311`.
- **Rationale**: The brand is explicitly "dark mode, precise" ("Cupping Room After Dark"). A single
  theme avoids a half-light broken state (edge case) and matches spec FR-002 / Assumptions.
- **Alternatives considered**:
  - *Dark default + light option* — rejected per the spec's dark-only assumption; can be revisited
    via `/speckit-clarify` if desired.

## D4. Offline fonts via self-hosted `@fontsource` packages

- **Decision**: Add `@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/hanken-grotesk`,
  and `@fontsource-variable/jetbrains-mono` (variable webfont packages) and import their CSS in
  `src/main.tsx`. Bundle ships the `woff2` files locally; no runtime CDN request.
- **Rationale**: The brand board pulls fonts from the Google Fonts CDN, which would break the brand
  offline and violate Principle IV. Self-hosting via Fontsource is reproducible, version-pinned,
  tree-shaken by Vite, and needs no manual font-file management. Satisfies FR-009 / SC-004.
- **Alternatives considered**:
  - *Google Fonts `<link>` (as in the brand board)* — rejected: network dependency; offline brand
    failure.
  - *Manually vendor `woff2` into `src/fonts` + hand-written `@font-face`* — workable but more
    manual and error-prone than Fontsource; held as fallback if a package is unavailable.
- **Render strategy**: declare brand faces with a system fallback stack and `font-display: swap`
  so first paint is never blocked (performance goal + web-font-failure edge case).

## D5. Type-role application

- **Decision**: Map the three faces to roles via tokens + minimal component edits:
  `--font-display` (Bricolage) on page titles, the wordmark, and coffee names; `--font-body`
  (Hanken) as the global `body` default for all copy/UI; `--font-mono` (JetBrains Mono) on data —
  ratings, ratios, temperatures, flavour tags, timestamps, and other numeric/label chips.
- **Rationale**: Body can be set once on `body` (most text inherits). Display and mono are
  element-specific, so headings/coffee-name nodes and data nodes get a `.font-display` / `.data`
  class (or inline `fontFamily: var(--font-mono)`). This is the irreducible per-component work and
  maps 1:1 to SC-002 (all data in mono).
- **Alternatives considered**:
  - *Mono globally on all numbers automatically* — not feasible in CSS; data nodes must be marked.

## D6. Card anatomy as a reusable pattern

- **Decision**: Express the brand "log card" as `.card` (slate surface, radius, padding) +
  `.card--accent` (the jade left edge) utility classes, applied to `DrinkCard`, `CoffeeCard`,
  `CoffeeList` rows, and brew timeline entries. Rating renders as `4.5 / 5.0` with the `/ 5.0`
  dimmed; tags use the `.tag` mono-pill class; venue gets the location-marker glyph; timestamp uses
  mono.
- **Rationale**: One pattern keeps every card consistent (the brand's hero surface) and avoids
  duplicating the structure across components. `DrinkCard` already approximates this; the others
  align to it.
- **Alternatives considered**:
  - *Per-card bespoke styling* — rejected: inconsistency risk on the most-repeated surface.

## D7. Voice & wordmark

- **Decision**: Render the wordmark as `Cup'd` with a jade apostrophe in the app chrome; update the
  `index.html` title; and rewrite key copy moments (greeting, empty states, primary CTAs, prompts)
  to the second-person Cup'd voice, removing generic/gamified phrasings.
- **Rationale**: Completes the identity (FR-004, FR-010, SC-007). Copy lives inline in components,
  so this is localized text edits plus one small wordmark element.
- **Alternatives considered**:
  - *Keep existing copy/name (visuals only)* — rejected per the full-adoption assumption; flagged
    for `/speckit-clarify` if the user wants to narrow scope.

## D8. Contrast & motion safety

- **Decision**: Verify WCAG AA for the brand pairs and honour reduced-motion. Computed contrast on
  Ink `#121311`: Bone `~17:1`, Bone-dim `~6.7:1` (passes AA body), Jade `~8:1` — all pass; only
  jade-on-slate or fine clay usage needs spot-checking. Add `@media (prefers-reduced-motion: reduce)`
  to disable reveal animations and the grain texture.
- **Rationale**: FR-011/FR-012, SC-003/SC-008. The palette is accessible as given, so no value
  changes are expected — but the gate is enforced during QA.
- **Alternatives considered**: none needed; values pass.

---

**Output**: No unknowns remain. All decisions stay within the constitution's stack; G2/G5 are N/A
(no AI). Proceed to Phase 1.
