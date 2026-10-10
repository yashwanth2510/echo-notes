# Voice MOM

Turn voice notes and meeting recordings into clean transcripts, summaries, and Minutes of
Meeting (MOM) with action items — right in the browser.

- **Record in the browser** (or upload an audio file)
- **Transcribe + summarize** in one step using OpenRouter (audio-capable models)
- **English / Hindi / Hinglish / auto-detect**
- **Free to run**: no database, notes are saved in your browser only
- Your OpenRouter key lives **server-side** (never exposed to the browser)

---

## 1. Requirements

- Node.js 18+ (you have Node 24)
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
> (`allow-remote=none` is set). On a normal machine, plain `npm install` works.

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

## Free deployment notes

- Deploy free on **Vercel** (connect the repo, add `OPENROUTER_API_KEY` in project settings).
- Free serverless hosts cap request size (~4.5 MB on Vercel). At 16 kHz mono WAV that is roughly
  **~5 minutes** of audio per request. For longer meetings, host on Cloudflare Workers + R2, a
  small VM, or split the audio into chunks.
- OpenRouter's free models are rate-limited; keep recordings reasonably short and expect retries.

## Ideas to monetize later

- Add auth + per-user minute counter, then a free/Pro paywall (Razorpay/Stripe).
- Team workspaces, PDF/DOCX export, email/Notion/Slack delivery.
- WhatsApp front-end: point the Meta Cloud API webhook at a `POST /api/summarize`-style endpoint.
