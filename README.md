# Echo Notes

Turn voice notes and meeting recordings into clean transcripts, summaries, and Minutes of
Meeting (MOM) with action items — **100% in your browser**.

- **Record in the browser** (or upload an audio file)
- **Everything runs locally**: transcription and summarization run on *your* device via
  [transformers.js](https://huggingface.co/docs/transformers.js) — no servers, no API keys, works
  even offline.
- **Private**: your voice never leaves your machine.
- **45+ languages** (English, Hindi, Hinglish, Bengali, Tamil, Telugu, Spanish, Arabic, Japanese…)
- 6 output modes: full MOM, summary, key points, decisions, action items, or raw transcript.
- **Free forever** — no subscriptions, no paid tiers.
- **Best-accuracy multilingual speech** built in — 99 languages, including Indian languages
  (Hindi, Hinglish, Tamil, Telugu, Bengali…).
- **Fast setup**: Transcript mode downloads only ~540 MB; full outputs download ~1 GB once,
  then everything is cached and works offline.

> Optional: with a free Supabase project you can add **Google sign-in** and sync your saved notes
> per-account. Without it, notes are stored in your browser.

---

## 1. Requirements

- Node.js 18+ (Node 22 recommended)
- A reasonably modern browser (Chrome/Edge/Firefox). The AI models are downloaded on first use
  (~540 MB transcription + ~490 MB summarization, cached in the browser afterward).

## 2. Install

```
npm install --allow-remote=all
```

> `--allow-remote=all` is only needed on this machine because it uses a corporate npm feed. On a
> normal machine (and on Render), plain `npm install` works.

## 3. Run

```
npm run dev
```

Open http://localhost:3000, click **Start recording**, allow the microphone, speak, then
**Stop & create notes**. First run downloads the models — after that it works offline.

Production build:

```
npm run build
npm start
```

## 4. Optional: Google sign-in + saved notes (Supabase)

Skip this to stay fully local. To add accounts:

1. Create a free project at https://supabase.com
2. Enable Google as an auth provider (Authentication → Providers → Google) and add the Supabase
   redirect URL to your Google OAuth client: `https://<ref>.supabase.co/auth/v1/callback`
3. Run `supabase/migrations/0001_notes.sql` in the Supabase SQL editor
4. Set in `.env.local` (and in your host's env):

```
NEXT_PUBLIC_SUPABASE_URL=<project url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
```

With these set, visitors sign in with Google and their notes are saved per-account. Without them,
anyone can use the app locally — notes are kept in the browser.

---

## Deploy on Render (free)

This repo includes a `render.yaml` blueprint. The site is essentially static (all AI runs in the
browser), so Render only needs to serve the built app.

1. Push the repo to GitHub.
2. https://dashboard.render.com → **New** → **Blueprint** → connect this repo.
3. Optionally set the `NEXT_PUBLIC_SUPABASE_*` secrets (`sync: false`) for account sync.
4. Deploy. Render gives you a URL like `https://echo-notes.onrender.com`. If that name is already
   taken, Render appends a short suffix (e.g. `https://echo-notes-ap43.onrender.com`). To use a name
   you own instead, add it under the service's **Settings → Custom Domains** and point a `CNAME`
   at `<service>.onrender.com`.

Notes:
- Render's free web service **spins down after ~15 min idle** and cold-starts in ~30–60s on the
  next request. A free UptimeRobot HTTP monitor pinging every 5 min keeps it warm.
- The heavy work (AI) happens in the visitor's browser, so CPU/RAM/Bandwidth on Render stay tiny.

## How it works

```
Browser mic ─▶ MediaRecorder ─▶ decode + resample to 16 kHz PCM
        │
        ▼  (all on this device)
On-device speech model (transformers.js, WebAssembly) ─▶ transcript
        │
On-device language model (local)             ─▶ summary / MOM / decisions / action items
        ▼
Markdown result shown, copied, downloaded, saved (browser or Supabase if configured)
```

- `lib/local-ai.ts` — loads the on-device transcription and summarization models into the browser.
- `lib/audio.ts` — converts the recording to 16 kHz mono PCM for the speech model.
- `components/Recorder.tsx` — recording UI, live spectrum, settings, progress, history.
- `components/AuthGate.tsx` + `lib/supabase/*` — optional Google sign-in + per-user notes.