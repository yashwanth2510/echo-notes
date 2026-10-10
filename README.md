# Echo Notes

Turn voice notes and meeting recordings into clean transcripts, summaries, and Minutes of
Meeting (MOM) with action items — right in the browser.

- **Record in the browser** (or upload an audio file)
- **Free transcription** with Groq Whisper, **free summarization** with an OpenRouter free model
- **English / Hindi / Hinglish / auto-detect**
- **Free to run**: no database, notes are saved in your browser only
- All API keys live **server-side** (never exposed to the browser)

---

## 1. Requirements

- Node.js 18+ (Node 22 recommended)
- A free **Groq** API key (transcription): https://console.groq.com/keys
- A free **OpenRouter** API key (summarization): https://openrouter.ai/keys
  (free text models work with $0 balance)

## 2. Configure your keys

Copy `.env.example` to `.env.local` and fill in:

```
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxx
GROQ_WHISPER_MODEL=whisper-large-v3

OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
OPENROUTER_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

> Pipeline: **Groq Whisper** turns audio → text (free), then an **OpenRouter free model** turns
> text → summary/MOM (free). Change `OPENROUTER_MODEL` to any model you like; a `:free` model
> needs $0 balance. If `GROQ_API_KEY` is empty, the app falls back to OpenRouter audio, which
> requires a paid balance.

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
2. https://dashboard.render.com → **New** → **Blueprint** → connect this repo. Render reads
   `render.yaml` and creates the `echo-notes` web service.
   - Or: **New** → **Web Service** → pick the repo, Build Command `npm install && npm run build`,
     Start Command `npm start`.
3. Set the two secrets when prompted (both `sync: false`, so never stored in the repo):
   **`GROQ_API_KEY`** and **`OPENROUTER_API_KEY`**.
4. Deploy. Render gives you `https://echo-notes.onrender.com` (name may vary).

Notes:
- Render's free web service **spins down after ~15 min idle** and cold-starts in ~30–60s on the
  next request — fine for personal use.
- `next start` reads the `PORT` env var Render provides automatically.

---

## How it works

```
Browser mic ─▶ MediaRecorder ─▶ decode + resample to 16 kHz mono WAV
        │
        ▼  POST base64 wav ─▶ /api/summarize  (Next.js route, holds the keys)
        │
        ├─ Groq Whisper (free)            ─▶ transcript
        └─ OpenRouter free model (free)   ─▶ transcript ─▶ summary / MOM / action items
        ▼
   Markdown result shown, copied, downloaded, and saved in localStorage
```

- `app/api/summarize/route.ts` — transcribes with Groq, summarizes with OpenRouter.
- `lib/audio.ts` — converts the recording to a small 16 kHz mono WAV and base64-encodes it.
- `components/Recorder.tsx` — recording UI, settings, result, and browser history.

## Free-tier notes

- Groq Whisper free tier has per-minute rate limits; keep recordings reasonably short.
- OpenRouter free models are limited (~50 requests/day) and may be rate-limited.
- If a summary step fails, the app returns the **transcript** anyway (with a warning).

## Ideas to monetize later

- Add auth + per-user minute counter, then a free/Pro paywall (Razorpay/Stripe).
- Team workspaces, PDF/DOCX export, email/Notion/Slack delivery.
- WhatsApp front-end: point the Meta Cloud API webhook at a `POST /api/summarize`-style endpoint.
