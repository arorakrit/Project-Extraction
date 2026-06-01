# Phase 0 Research: Scan Bag to Coffee Card

**Feature**: 001-scan-bag-to-card
**Date**: 2026-05-31
**Inputs**: spec.md, constitution.md v1.0.0

This document resolves the three deferred constitutional TODOs
(`REACT_META_FRAMEWORK`, `API_KEY_HANDLING`, `STORAGE_TECHNOLOGY`) and records
the supporting best-practice decisions needed to enter Phase 1 design.

---

## Decision 1: React meta-framework

**Decision**: **Vite SPA**, no meta-framework.

**Rationale**:
- The app is single-user, mobile-first, fully client-side, with all data local.
  There is no public content to render server-side and no SEO surface.
- Vite is already wired into the starter (`vite.config.js`, `package.json`),
  so adoption cost is zero.
- Vite's instant HMR materially helps the tight schema/prompt iteration loop
  that Principle II demands (change a Zod schema, see types ripple through TS
  immediately).
- A 3-view app (Scan / Library / Coffee Detail) does not need a router-driven
  framework; a tiny hash-based router (~30 LOC) is enough.

**Alternatives considered**:
- **Next.js** — SSR/RSC are unused; routing complexity unwarranted for 3
  screens; bundle is materially larger than Vite SPA. Rejected.
- **Remix** — same reasoning as Next; data-loading model designed for SSR we
  don't have. Rejected.
- **Create React App** — deprecated since 2023. Rejected.

**Resolves**: `TODO(REACT_META_FRAMEWORK)` from constitution v1.0.0 Sync Impact
Report. No constitution amendment required; this falls within the existing
"React + meta-framework deferred" language and merely picks one.

---

## Decision 2: Anthropic API key handling

**Decision**: **BYOK (Bring Your Own Key)**. The user is prompted on first
launch (or on first Claude call) to paste their Anthropic API key into a
Settings screen. The key is stored in IndexedDB under
`settings` store, key `anthropic_api_key`. Claude calls go browser-direct
using the `anthropic-dangerous-direct-browser-access: true` header.

**Rationale**:
- Honors the constitution's v1 spirit of "no backend." A serverless proxy
  would be a backend by another name (hosting, auth, abuse handling, billing).
- The current starter (`lib/claude.js` reading `import.meta.env.VITE_ANTHROPIC_KEY`)
  bundles the developer's key into the JS at build time. **Anyone who opens
  DevTools can extract it.** This is the worst-of-both-worlds path and must
  be removed before any deployment, public or otherwise.
- The product's likely early users (specialty-coffee + AI enthusiasts) overlap
  heavily with the population willing to create an Anthropic account. BYOK is
  socially acceptable for this segment.

**Threat model**:
- **Key storage**: IndexedDB is per-origin, same-origin policy enforced. Any
  JS running on the app's origin can read it. Mitigation: do **not** load any
  third-party scripts; render only structured fields or AI-returned text as
  text nodes (never `dangerouslySetInnerHTML`). XSS would expose the key.
- **Network capture**: The user's key is sent to `api.anthropic.com` over
  HTTPS. The user's own DevTools can see it, which is acceptable for a BYOK
  app; no other party has access.
- **Key rotation**: User updates the key in Settings; old key is overwritten.
  No key history retained.
- **Loss**: Clearing site data removes the key. The user re-enters it. No
  silent re-derivation; we never log or store it elsewhere.
- **Out of scope for v1**: Multi-key support, per-call key selection,
  organisation-billed keys via OAuth.

**Future evolution**: If a hosted SaaS variant is ever shipped, the swap to a
minimal proxy (Cloudflare Workers, ~50 LOC) is a single-file change inside
`src/ai/client.ts`. The wrapper isolates the transport detail from every
caller. No constitution amendment expected for that future change since the
constitution already permits either path.

**Alternatives considered**:
- **Minimal proxy now**: Adds hosting/billing/abuse burden; users still need
  some form of identity to rate-limit; introduces backend earlier than the
  constitution intended. Rejected for v1; viable for v2.
- **Bundled developer key (`VITE_ANTHROPIC_KEY`)**: Currently in the starter.
  Leaks the key publicly the moment the JS is served. Hard rejection — must
  be removed.

**Resolves**: `TODO(API_KEY_HANDLING)` from constitution v1.0.0 Sync Impact
Report.

---

## Decision 3: Local storage technology

**Decision**: **IndexedDB**, accessed via the `idb` library (Jake Archibald's
Promise wrapper, ~2 KB gzipped). Single database `project-extraction`
(initial version 1), two object stores:

| Store      | keyPath | Notes                                      |
|------------|---------|--------------------------------------------|
| `coffees`  | `id`    | One entry per saved coffee.                |
| `settings` | `key`   | Key/value table; v1 holds `anthropic_api_key`. |

**Rationale**:
- localStorage caps at ~5–10 MB and uses a synchronous API that blocks the
  main thread. Base64-encoded image data — a typical specialty bag photo at
  the resized 1568 px / JPEG-q85 target is ~150 KB — would let users hit the
  cap within ~30 coffees. Unacceptable.
- IndexedDB is the standard offline-first store on the web; constitution
  Principle IV explicitly recommends it.
- `idb` removes the cursor + transaction ceremony with minimal surface area;
  zero runtime dependencies of its own.
- Versioned `upgrade()` callbacks map directly to the constitution's "schema
  migrations MUST be versioned, forward-only" requirement.

**Migration from starter `localStorage`**: The starter App.jsx stores under
`localStorage["grind_coffees"]`. Since nothing is in production and the
starter will be migrated wholesale to TS, **we do not write a localStorage
→ IndexedDB migration**. If any dev has prior `grind_coffees` data, they
re-scan. Documented in quickstart.md.

**Alternatives considered**:
- **localStorage**: too small, sync API, no transactions, no indexes.
  Rejected.
- **Dexie**: ~30 KB gzipped; query DSL we don't need at v1 scale. Rejected
  as overkill; viable if/when we need compound indexes.
- **SQLite WASM (`sql.js`, `@sqlite.org/sqlite-wasm`)**: Web Worker needed,
  bundle bloat (>500 KB), overkill for ~1,000 records. Rejected.
- **PouchDB**: Aimed at sync; we don't need sync in v1. Rejected.

**Resolves**: `TODO(STORAGE_TECHNOLOGY)` from constitution v1.0.0 Sync Impact
Report.

---

## Decision 4 (best practice): AI structured output via tool use

**Decision**: Use Anthropic's **tool use** feature to obtain structured output
from `claude-sonnet-4-6`. Define one tool per call:
`record_coffee_label` (for extraction) and `record_coffee_enrichment` (for
enrichment). The tool's `input_schema` is derived from the Zod schema in
`src/ai/schemas/`, ensuring the schema definition and the runtime validator
are the **same artifact** (Principle II's single-source-of-truth rule).

**Rationale**:
- The starter approach asks for JSON via prompt + parses with `JSON.parse`.
  This is fragile: models occasionally wrap JSON in markdown code fences,
  preamble with explanation, or emit subtly invalid JSON. Tool use forces a
  structured response shape at the API layer.
- The same Zod object that validates the parsed tool_use input also produces
  the TypeScript type used by every downstream caller — schemas drift cannot
  happen by construction.
- Anthropic's tool_use documentation (current as of model `claude-sonnet-4-6`)
  guarantees that when a tool is forced (`tool_choice: { type: "tool",
  name: "record_coffee_label" }`), the response contains exactly one tool_use
  block matching the requested tool.

**Implementation note**: Convert Zod schemas to JSON Schema for the tool
definition using `zod-to-json-schema` (small, well-maintained). Principle II
requires a single source of truth — the Zod object — with the JSON Schema
derived at module load. Hand-mirroring is forbidden by the constitution
regardless of how small the schema is.

**Alternatives considered**:
- **Prompt-engineered JSON + `JSON.parse`** (current starter approach):
  fragile; no boundary validation; type drift inevitable. Rejected.
- **JSON mode** (Anthropic does not currently offer): N/A.

---

## Decision 5 (best practice): Image preprocessing before extraction

**Decision**: Client-side resize the captured photo to a maximum **1568 px on
the long edge** and re-encode as JPEG quality 85 before base64-encoding for
the Claude vision call. Skip if the image is already smaller.

**Rationale**:
- Anthropic's vision documentation indicates that images larger than ~1568 px
  on the long edge offer no extraction-accuracy gain at typical reading
  distances but cost significantly more input tokens.
- A native 12 MP iPhone photo is ~4032 × 3024 px and ~3 MB JPEG. Sending it
  unmodified costs roughly 4× the input tokens versus a 1568 px resize, with
  no visible accuracy difference for label text at typical bag-in-hand
  framing.
- Smaller payload also helps satisfy SC-001 (≤ 10 s to populated card on 4G).

**Implementation**: A small `src/lib/image.ts` using `createImageBitmap` +
`OffscreenCanvas` (or a regular `<canvas>` fallback for older Safari) for
resize, then `canvas.toBlob('image/jpeg', 0.85)` → base64.

**Alternatives considered**:
- **Send native resolution**: high token cost, slower, no accuracy benefit.
  Rejected on cost-discipline grounds (Principle V).
- **Server-side resize**: would require a backend. Rejected.

---

## Decision 6 (best practice): Mobile capture UX

**Decision**: Use `<input type="file" accept="image/*" capture="environment">`
for camera capture, exactly as the starter does. No custom `getUserMedia` /
live preview camera in v1.

**Rationale**:
- `<input capture>` works without additional permission prompts beyond the OS
  file picker on both iOS Safari and Android Chrome.
- It gives the OS's camera UI for free — exposure controls, focus tap,
  cancel — at zero implementation cost.
- A custom `getUserMedia` camera would need a shutter button, focus indicator,
  front/back switcher, orientation handling, and permission management — all
  unnecessary for the v1 capture experience.
- Same input element doubles as a gallery picker on long-press (iOS) or via
  the OS-level switcher (Android), satisfying FR-002 with no extra code.

**Alternatives considered**:
- **`getUserMedia` + canvas shutter**: significant complexity; deferred to a
  future "in-app camera enhancements" feature if user research demands it.
  Rejected for v1.

---

## Decision 7 (best practice): Retry + observability shape

**Decision**: Centralise all Claude calls in `src/ai/client.ts`. The wrapper:

1. Reads the BYOK key from `settings` store.
2. Resizes image (extraction call only) via `lib/image.ts`.
3. Sends the request with `anthropic-version: 2023-06-01`,
   `anthropic-dangerous-direct-browser-access: true`, and the forced
   `tool_choice`.
4. On HTTP error, throws a typed `ClaudeNetworkError`.
5. On schema-validation failure of the tool_use input, retries **exactly
   once** with the same prompt and image (sometimes the model returns an
   off-schema response; a retry typically fixes it). On second failure,
   throws `ClaudeSchemaError`.
6. Emits a telemetry record to `lib/telemetry.ts` with: model id, latency
   ms, output tokens, input image bytes (size only — no pixel data),
   success/failure reason.

**Rationale**: Implements Principle V (Observability & Cost Discipline)
without scattering instrumentation across components. Failure surface is
typed so views can render the right error UI.

---

## Open questions / explicitly out of scope

- **Multi-language labels (Japanese, Korean, Arabic)**: spec edge case mentions
  the system should handle these gracefully. v1 plan is to send the image
  as-is to Claude and let the model do whatever transliteration it manages;
  no special prompt handling. Acceptable per the spec's edge-case wording
  ("populated where it can transliterate or translate, original-language
  values preserved where it cannot").
- **Duplicate detection across saved coffees**: spec explicitly defers this.
  Not addressed.
- **Image storage beyond the data URL**: v1 stores the resized JPEG as a
  data URL embedded in the coffee record. For ~1,000 records this is fine
  (~150 MB worst case, well within IndexedDB per-origin quotas of ~half of
  free disk). If quota becomes a concern, a future feature can move images
  to a separate object store keyed by hash.
- **PWA / offline install**: not in this feature; will be a follow-up.
