<!--
SYNC IMPACT REPORT
==================
Version change: (uninitialized template) → 1.0.0
Rationale: Initial ratification — first concrete fill of the template, establishing
all five core principles, technology constraints, and governance rules.

Modified principles:
  - [PRINCIPLE_1_NAME] → I. Spec-Driven Development (NON-NEGOTIABLE)
  - [PRINCIPLE_2_NAME] → II. AI Schema-First Contracts (NON-NEGOTIABLE)
  - [PRINCIPLE_3_NAME] → III. Mobile-First, Touch-First UX
  - [PRINCIPLE_4_NAME] → IV. Local-First Persistence
  - [PRINCIPLE_5_NAME] → V. Observability & Cost Discipline

Added sections:
  - Technology & Architecture Constraints (Section 2)
  - Development Workflow & Quality Gates (Section 3)
  - Concrete Governance rules (amendment procedure, versioning policy, compliance reviews)

Removed sections:
  - None (initial fill)

Templates requiring updates:
  - ✅ .specify/memory/constitution.md (this file)
  - ✅ .specify/templates/plan-template.md (Constitution Check gate populated with concrete checks)
  - ⚠ .specify/templates/spec-template.md (no change required — generic; principles
       are enforced via plan-template gates, not spec template)
  - ⚠ .specify/templates/tasks-template.md (no change required — principle-driven
       task categories surface during /speckit-tasks based on plan.md)
  - ⚠ .specify/templates/checklist-template.md (no change required — checklist
       content is generated per-feature by /speckit-checklist)
  - ⚠ CLAUDE.md (no change required at this time — runtime guidance is minimal;
       will expand as first feature plan lands)

Deferred / Follow-up TODOs:
  - TODO(REACT_META_FRAMEWORK): Vite vs. Next.js (or other) not yet decided —
    resolve during the first /speckit-plan run and record in plan.md.
  - TODO(API_KEY_HANDLING): Browser-direct Anthropic call (user-supplied key) vs.
    minimal proxy — resolve during the first /speckit-plan run; record threat
    model in plan.md.
  - TODO(STORAGE_TECHNOLOGY): IndexedDB strongly recommended for Principle IV;
    confirm in first plan.md.
-->

# Project Extraction Constitution

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

Every user-visible feature MUST begin life as a numbered spec under
`specs/[###-feature-name]/spec.md`, authored via `/speckit-specify`, refined via
`/speckit-clarify`, planned via `/speckit-plan`, and decomposed via
`/speckit-tasks` BEFORE any production code is written. The constitution, the
feature spec, and the implementation plan are the source of truth; deviations
during implementation MUST trigger a spec amendment (or a constitution
amendment), never an undocumented divergence.

**Rationale**: Coffee + AI is an exploratory product space where prompts, schemas,
and UX assumptions co-evolve quickly. Without spec-first discipline, the AI
surface drifts, tests rot against stale prompts, and the local-store schema
silently bifurcates between code paths.

### II. AI Schema-First Contracts (NON-NEGOTIABLE)

Every Claude `claude-sonnet-4-6` invocation — vision extraction from bag photos,
training-knowledge enrichment, and voice-transcript structuring — MUST declare a
typed output schema (via tool use / structured output) and MUST validate the
response against that schema BEFORE any persistence, indexing, or UI render. The
following rules are absolute:

- Free-text model output MUST NOT be persisted into structured slots (e.g.,
  `roaster`, `origin`, `brew_method`, `rating`).
- Missing, low-confidence, or unreadable fields MUST be represented as explicit
  `null` or a dedicated `unknown` sentinel — never fabricated, never inferred
  silently.
- Schemas live in version-controlled TypeScript types under `src/ai/schemas/`
  and MUST be referenced by both the Claude tool definition and the runtime
  validator (single source of truth — no parallel hand-written shapes).
- A change to any AI schema or its accompanying prompt MUST ship with at least
  one updated golden fixture in `tests/ai-fixtures/`.

**Rationale**: The product's data integrity — every coffee card, every brew log —
is downstream of structured AI output. A single hallucinated `roaster` or
silently-dropped `rating` corrupts the local store permanently, since there is
no server-side reconciliation.

### III. Mobile-First, Touch-First UX

All UI MUST be designed and verified at mobile viewport widths (≤ 430px) FIRST;
desktop layouts are a progressive enhancement, not a baseline. Specifically:

- Touch targets MUST meet a 44×44 CSS-pixel minimum.
- Camera capture, voice capture, and primary navigation MUST each be reachable
  within one thumb-zone tap from any primary screen.
- Desktop-only interactions (hover-only menus, right-click, multi-pointer
  gestures) MUST NOT be the sole path to any feature.
- Every PR that touches UI MUST be verified in a mobile viewport (real device or
  emulator) before merge; verification evidence (screenshot or note) goes in the
  PR description.

**Rationale**: The hero flows — photographing a bag in a café, speaking a brew
note over a fresh pour — are inherently in-hand, in-the-moment, often
one-handed. Desktop-first habits silently produce UIs that fail at the exact
moment of use.

### IV. Local-First Persistence

All coffee profiles and brew logs MUST be stored locally on the device
(IndexedDB recommended) as the authoritative source of truth. Network calls are
limited to Claude API invocations and explicit user-initiated actions. Specific
guarantees:

- Loss of network connectivity MUST NOT prevent reading any previously saved
  coffee or brew log.
- Voice transcripts captured offline (where the Web Speech API permits) MUST be
  queueable for later AI structuring without data loss.
- Any future sync/cloud-backup feature MUST treat the local store as the writer
  of record; the cloud is a mirror, not the master.
- Schema migrations on the local store MUST be versioned, forward-only, and
  written with an explicit downgrade-impossible note when applicable.

**Rationale**: Coffee bags are photographed in cafés with patchy Wi-Fi; brew
notes are dictated next to a noisy grinder. A server-dependent design would fail
exactly when the user most wants the app.

### V. Observability & Cost Discipline

Every Claude API call MUST be instrumented with, at minimum: input size, output
token count, latency, model id, and a structured failure reason on error.
Specifically:

- Per-session aggregate token spend MUST be surfaced in developer builds (a
  visible badge or console group is acceptable for v1).
- Failed extractions MUST follow a documented retry strategy (max 1 retry with
  backoff) and surface a user-actionable message ("couldn't read the label —
  try a clearer photo") — silent failure is forbidden.
- Any feature that introduces ≥ 3 Claude calls per single user action MUST be
  flagged in the corresponding plan.md `Complexity Tracking` table with a cost
  justification.
- Logs MUST NOT include raw image bytes or full voice audio; redact to size +
  duration metadata.

**Rationale**: Vision + enrichment + voice structuring can easily stack three or
more Claude calls per "add a coffee" interaction. Without instrumentation, both
cost and output quality degrade silently, and regressions in extraction accuracy
become invisible until a user complains.

## Technology & Architecture Constraints

The following constraints derive from the product description and are
constitutional — changes require a MINOR or MAJOR amendment, not a plan-level
decision:

- **UI Framework**: React. The meta-framework choice (Vite SPA, Next.js, etc.)
  is deferred to the first `/speckit-plan` run — see TODO(REACT_META_FRAMEWORK).
- **Language**: TypeScript MUST be used throughout. Principle II (Schema-First)
  depends on compile-time enforcement of AI output shapes.
- **AI Model**: Claude `claude-sonnet-4-6` is the designated model for vision
  extraction, training-knowledge enrichment, and voice-transcript structuring.
  Substituting models requires a MINOR amendment and re-running golden fixtures.
- **Voice Capture**: Web Speech API. Browsers without support (notably partial
  on iOS Safari) MUST be detected on first use and surfaced with a clear,
  non-blocking notice — voice MUST NOT be a hidden hard dependency for adding a
  coffee (photo + manual edit MUST remain a viable path).
- **Persistence**: Local, on-device. IndexedDB recommended. No backend database
  in v1.
- **Secrets**: The Anthropic API key handling model (browser-direct vs. minimal
  proxy) is deferred to the first plan — see TODO(API_KEY_HANDLING). Whichever
  path is chosen MUST NOT ship the key in committed source.

## Development Workflow & Quality Gates

The following gates apply to every PR. The Constitution Check in plan-template.md
enforces these at planning time; CI / pre-merge review enforces them at code time.

- **Type-checking**: `tsc --noEmit` MUST pass.
- **Linting**: Project linter (eslint or equivalent) MUST pass.
- **Unit tests**: Deterministic logic (schema validators, local-store
  reducers, formatters) MUST have unit tests; coverage of the AI schema
  validators specifically MUST be ≥ 90%.
- **AI golden fixtures**: Any prompt or schema change MUST update at least one
  fixture under `tests/ai-fixtures/`. The fixture suite is the regression net
  for Principle II.
- **Mobile verification**: UI-touching PRs MUST include evidence of mobile
  viewport testing (see Principle III).
- **Cost & call-count audit**: PRs that add or modify any Claude call MUST
  state, in the PR description, the expected calls-per-user-action and any
  changes to the per-session token spend trend.
- **Spec lineage**: PRs implementing a feature MUST link the corresponding
  `specs/[###-feature-name]/` directory.

## Governance

This constitution supersedes other project documents on matters of principle. If
any doc (README, design note, ad-hoc Slack decision) contradicts the
constitution, the constitution wins until amended.

**Amendment procedure**:

1. Open a PR that edits `.specify/memory/constitution.md` and prepends an
   updated Sync Impact Report (the HTML comment at the top).
2. PR title MUST follow the pattern: `constitution: amend to vX.Y.Z (<summary>)`.
3. The PR MUST also update any dependent template flagged in the Sync Impact
   Report; amendments that leave templates out of sync MUST NOT merge.
4. Amendments require explicit approval from the project owner.

**Versioning policy** (semantic):

- **MAJOR**: A principle is removed or its meaning is materially redefined in a
  backward-incompatible way; or a constitutional technology constraint is
  reversed (e.g., adopting a backend).
- **MINOR**: A new principle or section is added, or existing guidance is
  materially expanded (new MUST/SHOULD rules).
- **PATCH**: Clarifications, wording, typo fixes, non-semantic refinements that
  do not change what is required or forbidden.

**Compliance reviews**:

- Every `/speckit-plan` run MUST evaluate the Constitution Check gate and record
  the result in plan.md.
- Every `/speckit-analyze` run MUST cross-check spec.md, plan.md, and tasks.md
  against this constitution and report drift.
- Quarterly: project owner reviews the constitution to confirm it still
  reflects reality; outcome (no-change, PATCH, MINOR, MAJOR) is recorded in a
  short note in the corresponding amendment PR.

**Runtime guidance**: `CLAUDE.md` at the repository root provides AI-assistant
guidance during day-to-day development and MUST be kept consistent with this
constitution.

**Version**: 1.0.0 | **Ratified**: 2026-05-29 | **Last Amended**: 2026-05-29
