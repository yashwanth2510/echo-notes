# Echo Notes

Turn voice notes and meeting recordings into clean transcripts, summaries, and Minutes of
Meeting (MOM) with action items — **100% in your browser**.

- **Record in the browser** (or upload an audio file)
- **Everything runs locally**: Whisper (transcription) + Qwen2.5 (summarization) run on *your*
  device via [transformers.js](https://huggingface.co/docs/transformers.js) — no servers, no API
  keys, works even offline.
- **Private**: your voice never leaves your machine.
- **45+ languages** (English, Hindi, Hinglish, Bengali, Tamil, Telugu, Spanish, Arabic, Japanese…)
- 6 output modes: full MOM, summary, key points, decisions, action items, or raw transcript.
- **Free forever** — no subscriptions, no paid tiers.
- **Best-accuracy multilingual speech** built in: `whisper-large-v3-turbo` handles 99 languages,
  including Indian languages (Hindi, Hinglish, Tamil, Telugu, Bengali…).
- **Fast setup**: Transcript mode downloads only ~540 MB; full outputs download ~1 GB once
  (Whisper 540 MB + Qwen 490 MB), then everything is cached and works offline.

> Optional: with a free Supabase project you can add **Google sign-in** and sync your saved notes
> per-account. Without it, notes are stored in your browser.

---

## 1. Requirements

- Node.js 18+ (Node 22 recommended)
- A reasonably modern browser (Chrome/Edge/Firefox). The AI models downloaded on first use
  (~540 MB Whisper + ~490 MB Qwen, cached in the browser afterward).

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

## Optional: swap the models

All local AI defaults are overridable via env:

```
NEXT_PUBLIC_WHISPER_MODEL=onnx-community/whisper-large-v3-turbo  # best multilingual accuracy, ~540 MB (q4f16)
NEXT_PUBLIC_WHISPER_DTYPE=q4f16
NEXT_PUBLIC_LLM_MODEL=onnx-community/Qwen2.5-0.5B-Instruct  # multilingual, ~490 MB (q8)
NEXT_PUBLIC_LLM_DTYPE=q8
NEXT_PUBLIC_TRANSFORMER_DEVICE=wasm   # or webgpu for faster GPU inference
```

Presets (measured download sizes):
- **Best accuracy (default):** `whisper-large-v3-turbo` @ `q4f16` (~540 MB) — 99 languages.
- **Fastest (transcript only):** keep defaults but pick the *Transcript* output — only Whisper
  downloads (~540 MB).
- **Smaller Whisper, faster:** `Xenova/whisper-base` (~73 MB) or `Xenova/whisper-tiny` (~39 MB —
  noticeably weaker accuracy, especially on non-English).
- **Best accuracy (heaviest):** same turbo model at `q8` (~1 GB) — marginally better digits/odd
  words; rarely worth the extra download.
- **WebGPU speedup:** `NEXT_PUBLIC_TRANSFORMER_DEVICE=webgpu` uses your GPU when available.

> Note: `onnx-community/SmolLM2-*` and some other repos are access-gated on Hugging Face and
> will fail without a token, so defaults above use open, un-gated models only.

---

## Deploy on Render (free)

This repo includes a `render.yaml` blueprint. The site is essentially static (all AI runs in the
browser), so Render only needs to serve the built app.

1. Push the repo to GitHub.
2. https://dashboard.render.com → **New** → **Blueprint** → connect this repo.
3. Optionally set the `NEXT_PUBLIC_SUPABASE_*` secrets (`sync: false`) for account sync.
4. Deploy. Render gives you `https://echo-notes.onrender.com`.

Notes:
- Render's free web service **spins down after ~15 min idle** and cold-starts in ~30–60s on the
  next request. A free UptimeRobot HTTP monitor pinging every 5 min keeps it warm.
- The heavy work (AI) happens in the visitor's browser, so CPU/RAM/Bandwidth on Render stay tiny.

## How it works

```
Browser mic ─▶ MediaRecorder ─▶ decode + resample to 16 kHz PCM
        │
        ▼  (all on this device)
Whisper (transformers.js, WebAssembly) ─▶ transcript
        │
Qwen2.5-0.5B-Instruct (local)          ─▶ summary / MOM / decisions / action items
        ▼
Markdown result shown, copied, downloaded, saved (browser or Supabase if configured)
```

- `lib/local-ai.ts` — loads Whisper + Qwen2.5 into the browser, runs transcription/summarization.
- `lib/audio.ts` — converts the recording to 16 kHz mono PCM for Whisper.
- `components/Recorder.tsx` — recording UI, live spectrum, settings, progress, history.
- `components/AuthGate.tsx` + `lib/supabase/*` — optional Google sign-in + per-user notes.