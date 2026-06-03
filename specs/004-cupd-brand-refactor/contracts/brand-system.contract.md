# Contract: Cup'd Brand System

This feature exposes no network/API and no programmatic interface. The "contract" is the **visual
system** every surface must conform to. It is the acceptance reference for `/speckit-implement` and
the quickstart QA.

## 1. Token contract (source of truth: `style.css` `:root`)

Brand values that MUST be present (see data-model.md for the full table):

```text
--color-bg-primary:    #121311   (Ink — base)
--color-bg-secondary:  #232621   (Slate — cards)
--color-text-primary:  #E9E7DD   (Bone — text/headings)
--color-text-secondary:#9A9C92   (Bone-dim — meta)
--color-accent:        #3DBE8B   (Jade — accent, sparing)
--color-border-primary:  rgba(233,231,221,0.10)
--color-border-tertiary: rgba(233,231,221,0.06)
--font-display:  'Bricolage Grotesque Variable', <system serif fallback>
--font-body:     'Hanken Grotesk Variable', <system sans fallback>
--font-mono:     'JetBrains Mono Variable', <system mono fallback>
--touch-target-min: 44px   (UNCHANGED)
```

The light / `prefers-color-scheme` block is removed (dark-only). `theme-color` in `index.html` is
`#121311`.

## 2. Type-role contract

| Element | Face |
|---------|------|
| Wordmark, page titles (`h1`), coffee names | `--font-display` |
| Body copy, labels, buttons, descriptions | `--font-body` (global default) |
| Ratings, ratios, temperatures, flavour tags, timestamps, any numeric/data chip | `--font-mono` |

## 3. Card anatomy contract

Drink, coffee, and brew cards MUST render as a slate `.card` with a single jade `.card--accent`
edge and, where the data exists: display-font coffee name; `roaster · origin · process` meta line;
rating as `X.X` (jade) + `/ 5.0` (dimmed) in mono; `.tag` mono-uppercase pills; venue with a
location marker (mono); mono timestamp.

## 4. Voice contract

| Use | Don't |
|-----|-------|
| Second person — "What did you cup today?" | First person or generic "Rate your coffee experience!" |
| Knowing, calm, specific | Gamified hype — "Trending 🔥", emoji-led urgency |
| The product is **Cup'd** (wordmark with jade apostrophe) | The old "Project Extraction" name in visible chrome |

## 5. Per-surface acceptance checklist (test targets)

| ID  | Surface | Must show |
|-----|---------|-----------|
| S-01 | Home / Scan | Ink bg, Cup'd identity, display title, jade primary action, Cup'd-voice copy |
| S-02 | Library | Display title; coffee rows as branded cards; mono meta |
| S-03 | Drinks history | Branded log cards (S-card anatomy); empty state in Cup'd voice |
| S-04 | Coffee detail | Card anatomy; brew timeline data in mono |
| S-05 | Log-a-drink form | Slate fields, jade selected states, mono tag pills, display title; ≥44×44; no h-scroll @320–430px |
| S-06 | Voice brew flow | Branded surfaces; data in mono; functionality unchanged |
| S-07 | Settings | Branded surfaces; BYOK field usable; Cup'd voice |
| S-08 | Nav / FAB | Jade-accented, ≥44×44, thumb-reachable |

## 6. Global guarantees (test targets)

| ID  | Guarantee |
|-----|-----------|
| G-01 | No screen retains the previous light background or system font (SC-001). |
| G-02 | Every data value renders in mono wherever it appears (SC-002). |
| G-03 | Body text ≥4.5:1 contrast, large text ≥3:1 — every screen (SC-003). |
| G-04 | Full identity incl. fonts renders with no network (SC-004). |
| G-05 | `vitest`, `tsc --noEmit`, eslint all green — zero functional regression (SC-005). |
| G-06 | 44×44 targets and no horizontal scroll at 320–430px (SC-006). |
| G-07 | Product identifiable as "Cup'd" on first screen (SC-007). |
| G-08 | No non-essential motion with reduced-motion enabled (SC-008). |
