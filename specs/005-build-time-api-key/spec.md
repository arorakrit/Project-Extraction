# Feature Specification: Build-Time API Key with BYOK Fallback

**Feature Branch**: `005-build-time-api-key`

**Created**: 2026-06-12

**Status**: Draft

**Input**: User description: "update the BYOK and instead embed the API key into the app" — refined after
constitution review to: supply the key at build time from local, untracked configuration (never committed),
keeping the existing bring-your-own-key Settings flow as a fallback and override.

## Constitution Note

The constitution (v1.0.0, Technology & Architecture Constraints — Secrets) requires that the chosen key
handling model "MUST NOT ship the key in committed source." A literal hardcoded key was therefore rejected.
This feature complies by sourcing the key from local configuration that is excluded from version control.
**Accepted residual risk** (confirmed by project owner 2026-06-12): a key supplied at build time is present
in the distributed application and is extractable by anyone who can load the app. This is acceptable only
for personal or privately deployed builds; public deployments should continue to rely on bring-your-own-key.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use AI features with zero key setup (Priority: P1)

The app owner builds the app with their own API key supplied through local build configuration. When they
(or anyone using that build) open the app for the first time, every AI feature — scanning a bag, voice brew
logging, enrichment — works immediately, with no trip to Settings and no key to paste.

**Why this priority**: This is the entire point of the feature — removing the paste-a-key onboarding step
that currently blocks every AI flow on a fresh install.

**Independent Test**: Produce a build with a key supplied via local configuration, open it in a fresh
browser profile (no saved data), and scan a coffee bag. The scan succeeds without ever visiting Settings.

**Acceptance Scenarios**:

1. **Given** a build configured with a built-in key and a fresh device with no saved personal key,
   **When** the user initiates a bag scan, **Then** the scan proceeds and completes without any
   missing-key prompt.
2. **Given** a build configured with a built-in key, **When** the user opens Settings, **Then** Settings
   indicates that a built-in key is active, does not display the key's value, and still offers the field
   to save a personal key.
3. **Given** a build configured with a built-in key that has been revoked or is invalid, **When** the user
   initiates any AI action, **Then** the user sees an actionable message explaining the built-in key was
   rejected and inviting them to add a personal key in Settings.

---

### User Story 2 - Override with a personal key (Priority: P2)

A user of a build that has a built-in key prefers to use their own key (their own billing, their own
limits). They paste their key in Settings, and from then on all AI calls use their key. If they later
remove it, the app falls back to the built-in key instead of breaking.

**Why this priority**: Preserves the existing BYOK contract for current users and keeps billing control
in the user's hands; without it the built-in key would silently absorb other people's usage.

**Independent Test**: On a build with a built-in key, save a personal key in Settings, perform an AI
action, and confirm (via the existing per-call telemetry) the personal key was used; then clear it and
confirm the next AI action succeeds via the built-in key.

**Acceptance Scenarios**:

1. **Given** a built-in key is present and the user has saved a personal key, **When** any AI call is made,
   **Then** the personal key is used — the personal key always takes precedence.
2. **Given** the user has saved a personal key on a build with a built-in key, **When** they clear the
   personal key in Settings, **Then** AI features continue to work using the built-in key, and Settings
   shows the built-in key is active again.
3. **Given** an existing user who saved a personal key before this feature shipped, **When** they upgrade
   to a build with a built-in key, **Then** their saved key continues to be used with no visible change
   in behaviour.

---

### User Story 3 - Builds without a built-in key behave as today (Priority: P3)

A contributor clones the public repository and builds the app without supplying any key. The app behaves
exactly as it does today: AI features prompt the user to add a key in Settings, and everything else
(viewing saved coffees, brews, drinks) works normally.

**Why this priority**: The repository is public; most builds will not have a key. The no-key path must
remain a first-class, non-broken experience — it is also the proof that no key ships in committed source.

**Independent Test**: Build from a clean clone with no local key configuration, open the app, and attempt
a bag scan: the existing "add a key in Settings" message appears; saving a personal key then unblocks the
scan exactly as today.

**Acceptance Scenarios**:

1. **Given** a build with no built-in key and no saved personal key, **When** the user initiates an AI
   action, **Then** they see the existing missing-key message directing them to Settings.
2. **Given** a build with no built-in key, **When** the user opens Settings, **Then** the key section
   reads exactly as it does today, with no mention of a built-in key.
3. **Given** a clean clone of the repository, **When** the project is searched for key material, **Then**
   no API key value is found anywhere in version-controlled files.

---

### Edge Cases

- Built-in key is present but blank or whitespace-only in the local configuration → treated as absent
  (no-key behaviour), not as an invalid key.
- Built-in key is rejected by the AI provider (revoked, out of credit, malformed) → user-actionable error
  naming the built-in key as the cause and pointing to the personal-key path; no silent retry loop beyond
  the existing documented retry policy.
- User saves a personal key that is itself invalid while a valid built-in key exists → the personal key
  still takes precedence (no silent fallback that would hide the user's mistake); the error message must
  make clear the personal key was used.
- The local configuration file is accidentally staged for commit → version-control ignore rules must
  already exclude it, so this cannot happen through normal workflows.
- Settings must never display the built-in key's value, in full or in part.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The application MUST be able to receive an API key at build time from local configuration
  that is excluded from version control.
- **FR-002**: When a built-in key is present and no personal key is saved, all AI features MUST work
  without any user key setup.
- **FR-003**: A personal key saved in Settings MUST always take precedence over the built-in key for
  every AI call.
- **FR-004**: Clearing the saved personal key MUST revert AI features to the built-in key when one is
  present, and to the existing missing-key behaviour when none is present.
- **FR-005**: Settings MUST indicate which key source is currently active (built-in vs. personal) and
  MUST NOT reveal the built-in key's value.
- **FR-006**: Builds produced without a built-in key MUST behave identically to the current BYOK-only
  application, including the existing missing-key messaging.
- **FR-007**: No API key value may exist in any version-controlled file; the local configuration path
  that carries the key MUST be covered by version-control ignore rules, and an example configuration
  file (with a placeholder, never a real key) MUST document the expected setup.
- **FR-008**: When the built-in key is rejected by the AI provider, the user MUST see an actionable
  message that identifies the built-in key as the failing credential and offers the personal-key path.
- **FR-009**: A blank or whitespace-only built-in key value MUST be treated as no built-in key.

### Key Entities

- **Key source**: The resolved credential used for an AI call. Exactly one of: *personal* (saved by the
  user on this device — highest precedence), *built-in* (supplied at build time), or *none* (AI features
  prompt for setup). Resolution order is fixed: personal → built-in → none.
- **Personal key record**: The existing on-device saved key; unchanged in shape, storage, and lifecycle
  by this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a build with a built-in key, a first-time user completes a bag scan with zero
  key-related setup steps (currently ≥ 3: open Settings, obtain key, paste and save).
- **SC-002**: 100% of AI calls use the personal key whenever one is saved, regardless of built-in key
  presence (verifiable through the existing per-call telemetry).
- **SC-003**: A search of all version-controlled files finds zero API key values, before and after the
  feature ships.
- **SC-004**: Existing users with a saved personal key observe zero behaviour change after upgrading.
- **SC-005**: A contributor building from a clean clone without any key configuration reaches the same
  working app (minus AI features) as today, with no new errors or build steps.

## Assumptions

- The owner accepts that a built-in key is extractable from a distributed build; builds with a built-in
  key are intended for personal or privately shared deployment only (see Constitution Note).
- Personal-key-over-built-in precedence is the correct default: it keeps billing control with the user
  and preserves the existing BYOK contract without a migration.
- The built-in key is fixed at build time; changing it requires producing a new build. No runtime key
  rotation or remote key delivery is in scope.
- No change to where or how the personal key is saved on the device is in scope.
- AI usage telemetry, retry policy, and error-surfacing rules from the constitution (Principle V)
  continue to apply unchanged; this feature only changes which credential is attached to a call.
- Distribution/hosting of key-bearing builds is the owner's responsibility and out of scope.
