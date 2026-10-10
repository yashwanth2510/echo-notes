# Echo Notes

Turn voice notes and meeting recordings into clean transcripts, summaries, and Minutes of
Meeting (MOM) with action items — right in the browser.

- **Record in the browser** (or upload an audio file)
- **Transcribe + summarize** in one step using OpenRouter (audio-capable models)
- **English / Hindi / Hinglish / auto-detect**
- **Free to run**: no database, notes are saved in your browser only
- Your OpenRouter key lives **server-side** (never exposed to the browser)

---

## 1. Requirements

- Node.js 18+ (Node 22 recommended)
- A free OpenRouter API key: https://openrouter.ai/keys

## 2. Configure your key

Copy `.env.example` to `.env.local` and paste your key:

```
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
OPENROUTER_MODEL=google/gemini-2.5-flash
```

> The model **must support audio input** on OpenRouter. `google/gemini-2.5-flash` is a good
> free default. Browse audio models at https://openrouter.ai/models?modality=audio.

## 3. Install

```
npm install --allow-remote=all
```

> `--allow-remote=all` is only needed on this machine because it uses a corporate npm feed
> (`allow-remote=none` is set). On a normal machine (and on Render), plain `npm install` works.

## 4. Run

```
npm run dev
```

Open http://localhost:3000, click **Start recording**, allow the microphone, speak, then
**Stop & create notes**.

Production build:

```
npm run build
npm start
```

---

## Deploy on Render (free)

This repo includes a `render.yaml` blueprint.

1. Push the repo to GitHub (already done).
2. Go to https://dashboard.render.com → **New** → **Blueprint** → connect this repo. Render reads
   `render.yaml` and creates the `echo-notes` web service.
   - Or: **New** → **Web Service** → pick the repo, then set Build Command `npm install && npm run build`
     and Start Command `npm start`.
3. When prompted for the secret, set **`OPENROUTER_API_KEY`** to your key
   (it is marked `sync: false`, so it is **never** stored in the repo).
4. Deploy. Render gives you `https://echo-notes.onrender.com` (name may vary).

Notes:
- Render's free web service **spins down after ~15 min idle** and cold-starts in ~30–60s on the
  next request — fine for personal use.
- `next start` reads the `PORT` env var Render provides automatically; no extra config needed.

---

## How it works

```
Browser mic ──▶ MediaRecorder ──▶ decode + resample to 16 kHz mono WAV
        │
        ▼  POST base64 wav  →  /api/summarize  (Next.js route, holds the API key)
        │
        ▼  OpenRouter chat/completions  with input_audio  →  transcript + MOM
        ▼
   Markdown result shown, copied, downloaded, and saved in localStorage
```

- `app/api/summarize/route.ts` — server route: builds the prompt, calls OpenRouter, returns notes.
- `lib/audio.ts` — converts the recording to a small 16 kHz mono WAV and base64-encodes it.
- `components/Recorder.tsx` — recording UI, settings, result, and browser history.

## Ideas to monetize later

- Add auth + per-user minute counter, then a free/Pro paywall (Razorpay/Stripe).
- Team workspaces, PDF/DOCX export, email/Notion/Slack delivery.
- WhatsApp front-end: point the Meta Cloud API webhook at a `POST /api/summarize`-style endpoint.
