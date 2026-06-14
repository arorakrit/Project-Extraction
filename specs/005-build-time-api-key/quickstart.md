# Quickstart: Build-Time API Key with BYOK Fallback

**Feature**: `005-build-time-api-key` | **Date**: 2026-06-12

## Setup (key-bearing personal build)

1. Copy the example env file and add your key:

   ```powershell
   Copy-Item .env.example .env
   # edit .env → VITE_ANTHROPIC_KEY=sk-ant-your-key
   ```

   `.env` is git-ignored — verify with `git check-ignore .env` (must print `.env`).

2. Run or build as usual:

   ```powershell
   npm run dev      # built-in key active in dev
   npm run build    # built-in key baked into dist/
   ```

> ⚠️ **The key ships inside the bundle.** Anyone who can load this build can extract it.
> Personal / privately shared deployments only. **Never set `VITE_ANTHROPIC_KEY` in the
> Vercel project** — the public deployment stays BYOK-only. Use a dedicated key with a
> spend limit so it can be revoked without collateral damage.

## Verify — User Story 1: zero key setup (P1)

1. Open the dev server in a **fresh browser profile / cleared site data** (no IndexedDB).
2. Without visiting Settings, scan a coffee bag (`#/scan`).
3. ✅ Scan completes; no "add a key" prompt at any point.
4. Open Settings → ✅ shows the built-in key is active; the key value is **not** displayed.

## Verify — User Story 2: personal key overrides (P2)

1. On the same build, save a personal key in Settings.
2. Perform any AI action; in the dev "session usage" panel / `window.__telemetry.session()`,
   confirm the call succeeded (it used the personal key — to prove precedence, use an
   obviously-invalid personal key like `sk-ant-invalid` and confirm the action now **fails
   with a 401 naming your key**, even though the valid built-in key exists).
3. Clear the personal key in Settings.
4. ✅ Next AI action succeeds again via the built-in key; Settings shows built-in active.

## Verify — User Story 3: keyless build unchanged (P3)

1. Remove/rename `.env` (or set `VITE_ANTHROPIC_KEY=`), restart `npm run dev`.
2. Fresh profile → attempt a scan.
3. ✅ Existing missing-key message appears, directing to Settings.
4. ✅ Settings shows today's copy with no mention of a built-in key.
5. Save a personal key → scan works (pre-005 behaviour, FR-006).

## Verify — no key in committed source (SC-003)

```powershell
git ls-files | ForEach-Object { Select-String -Path $_ -Pattern 'sk-ant-' -SimpleMatch } |
  Where-Object { $_.Line -notmatch 'sk-ant-\.\.\.|sk-ant-your-key|sk-ant-invalid' }
```

✅ No output (placeholders in `.env.example`, UI placeholder text, and docs are the only
allowed `sk-ant-` occurrences).

## Gates (constitution §3)

```powershell
npm run typecheck
npm run lint
npm run test
```

All must pass; no fixture updates expected (no prompt/schema change — G2 N/A).
