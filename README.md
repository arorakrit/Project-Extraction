# Project Extraction

A mobile-first specialty-coffee discovery and brew-logging app. Photograph a
coffee bag → Claude extracts a structured coffee card; speak a brew note → it's
transcribed and structured into a brew log on the coffee's timeline.

- **Stack:** React + TypeScript + Vite (single-page app)
- **AI:** Claude `claude-sonnet-4-6` via tool use, with Zod-validated schemas
- **Storage:** local-first IndexedDB (via `idb`) — works offline
- **Key:** BYOK — your Anthropic API key is entered in Settings and stored
  client-side. No backend, no bundled secrets.

## Prerequisites

- Node 20+
- An Anthropic API key ([console.anthropic.com](https://console.anthropic.com/))

## Local development

```bash
npm install
npm run dev
```

Open the printed URL, go to **Settings**, and paste your Anthropic API key —
it's stored locally in the browser and never leaves the device except in calls
to Anthropic. No `.env` file is required.

### Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run test` | Run the test suite (Vitest) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src` and `tests` |

## Deploy (Vercel)

The app is a fully client-side SPA with hash routing and a BYOK key, so it
deploys as **static files with no backend and no environment variables**.
Deploy settings are pinned in [`vercel.json`](./vercel.json) (Vite preset,
`npm run build`, `dist/` output, SPA rewrite to `index.html`).

**Option A — GitHub integration (recommended).** Auto-deploys every push to
`main`.

1. At [vercel.com](https://vercel.com/) → **Add New → Project → Import** the
   `arorakrit/Project-Extraction` repo.
2. Accept the auto-detected **Vite** settings (already pinned in `vercel.json`).
   Leave **Environment Variables empty** — the API key is BYOK, set per-user in
   the app's Settings, not at build time.
3. **Deploy.** You'll get a production URL that redeploys on each push to `main`.

**Option B — Vercel CLI.**

```bash
npm i -g vercel
vercel          # first run: log in + link the project
vercel --prod   # deploy to production
```

After deploying, open the production URL and run a scan + voice-log flow to
confirm it works end to end.

## BYOK & privacy

- The Anthropic key is stored only in the browser (IndexedDB) on the device
  where it's entered. It is sent **only** to Anthropic's API, directly from the
  client.
- No analytics key, transcript, or audio is bundled or transmitted to any
  first-party server — there is no first-party server.
- Because the key is client-side, treat any deployed instance as personal: do
  not share a URL pre-loaded with your key. A server-side key proxy is tracked
  as a future option on the roadmap if the app is ever opened up publicly.
