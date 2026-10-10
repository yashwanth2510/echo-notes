import { NextResponse } from "next/server";
import { LANGUAGE_NAMES } from "@/lib/languages";

export const runtime = "nodejs";
export const maxDuration = 120;

type Mode = "mom" | "summary" | "keypoints" | "decisions" | "transcript" | "action";

type RequestBody = {
  audio?: string;
  format?: string;
  mode?: Mode;
  language?: string;
};

const SYSTEM_PROMPTS: Record<Mode, string> = {
  mom: `You are an expert meeting-notes assistant. You will receive a transcript of an audio recording (a voice note or meeting).
Produce clean Minutes of Meeting in Markdown with these sections, in this order:
# <a short descriptive title>
**Duration/Context**: one line if inferable, otherwise omit.

## Summary
A 3-6 sentence overview of what was discussed.

## Key Points
Bullet points of the important things said.

## Decisions
Bullet points of any decisions made (write "None noted" if none).

## Action Items
A Markdown table with columns: | Action | Owner | Due |. Use "Unassigned" / "Not specified" when unknown.

## Follow-ups
Bullet points of open questions or next steps.

Use only what is in the transcript. Do not invent details. Write "Unclear" for inaudible parts.`,
  summary: `You are an expert note-taker. You will receive a transcript of an audio recording.
Produce a Markdown response with:
# <short title>
## Summary
A 3-6 sentence overview.
Use only what is in the transcript. Do not invent details.`,
  keypoints: `You are an expert note-taker. You will receive a transcript of an audio recording.
Produce a Markdown response with:
## Key Points
Bullet points of the most important ideas, facts, and figures from the transcript.
Use only what is in the transcript. Do not invent details.`,
  decisions: `You are an expert note-taker. You will receive a transcript of an audio recording.
Produce a Markdown response with:
## Decisions
Bullet points of any decisions, confirmations, or agreed next steps. Write "None noted" if none.
Use only what is in the transcript. Do not invent details.`,
  transcript: `You are a precise transcription engine. Transcribe the audio exactly as spoken.
Output only the transcript as plain text. Include speaker labels (Speaker 1, Speaker 2, ...) only if you can reliably tell speakers apart. Do not summarize.`,
  action: `You are an action-item extractor. You will receive a transcript of an audio recording.
Output a Markdown response with only:
## Action Items
A Markdown table with columns: | Action | Owner | Due |.
Plus a short "## Follow-ups" bullet list if there are unresolved questions.
Use only what is in the transcript. Do not invent details.`,
};

function languageInstruction(value: string): string {
  if (value === "auto") {
    return "Detect the spoken language automatically and write the output in that same language.";
  }
  if (value === "hinglish") {
    return "Write the output in natural Hinglish (Hindi written in Latin script) if the transcript is Hinglish, otherwise keep the spoken language.";
  }
  const name = LANGUAGE_NAMES[value];
  if (!name) {
    return "Detect the spoken language automatically and write the output in that same language.";
  }
  return `Write the ENTIRE output in ${name}. Translate if needed. Keep names and action-item owners as spoken.`;
}

function resolveLanguage(value?: string): string {
  return value && LANGUAGE_NAMES[value] ? value : "auto";
}

function resolveMode(value?: string): Mode {
  return value && value in SYSTEM_PROMPTS ? (value as Mode) : "mom";
}

const WHISPER_LANG_EXCLUDED = new Set(["auto", "hinglish"]);

async function transcribeWithGroq(base64: string, language: string): Promise<string> {
  const key = process.env.GROQ_API_KEY as string;
  const bytes = Buffer.from(base64, "base64");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "audio/wav" }), "audio.wav");
  form.append("model", process.env.GROQ_WHISPER_MODEL || "whisper-large-v3");
  form.append("response_format", "json");
  if (!WHISPER_LANG_EXCLUDED.has(language)) {
    form.append("language", language);
  }

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: form,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Groq transcription failed (${res.status}): ${raw.slice(0, 400)}`);
  }
  const data = JSON.parse(raw) as { text?: string };
  if (!data.text) throw new Error("Groq returned no transcript.");
  return data.text;
}

async function transcribeWithOpenRouter(
  base64: string,
  format: string,
  apiKey: string,
): Promise<string> {
  const model = process.env.OPENROUTER_AUDIO_MODEL || "google/gemini-2.5-flash";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
      "X-Title": process.env.SITE_NAME || "Echo Notes",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS.transcript },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe the audio exactly as spoken." },
            { type: "input_audio", input_audio: { data: base64, format } },
          ],
        },
      ],
    }),
  });
  const raw = await res.text();
  const data = JSON.parse(raw);
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenRouter transcription failed (${res.status})`);
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error("OpenRouter returned no transcript.");
  return text;
}

async function summarizeWithGroq(
  transcript: string,
  mode: Mode,
  language: string,
  apiKey: string,
): Promise<string> {
  const model = process.env.GROQ_CHAT_MODEL || "openai/gpt-oss-120b";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[mode] },
        {
          role: "user",
          content: `Output language rule: ${languageInstruction(language)}\n\nTranscript:\n"""\n${transcript}\n"""`,
        },
      ],
    }),
  });
  const raw = await res.text();
  const data = JSON.parse(raw);
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || `Groq summary failed (${res.status})`);
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error("Groq returned an empty summary.");
  return text;
}

async function summarizeWithOpenRouter(
  transcript: string,
  mode: Mode,
  language: string,
  apiKey: string,
): Promise<string> {
  const model = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
      "X-Title": process.env.SITE_NAME || "Echo Notes",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[mode] },
        {
          role: "user",
          content: `Output language rule: ${languageInstruction(language)}\n\nTranscript:\n"""\n${transcript}\n"""`,
        },
      ],
    }),
  });
  const raw = await res.text();
  const data = JSON.parse(raw);
  if (!res.ok) {
    throw new Error(data?.error?.message || data?.error || `OpenRouter summary failed (${res.status})`);
  }
  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") throw new Error("OpenRouter returned an empty summary.");
  return text;
}

export async function POST(request: Request) {
  const groqKey = process.env.GROQ_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!groqKey && !openRouterKey) {
    return NextResponse.json(
      { error: "Set GROQ_API_KEY (free transcription) and/or OPENROUTER_API_KEY in .env.local." },
      { status: 500 },
    );
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const audio = body.audio;
  if (!audio || typeof audio !== "string") {
    return NextResponse.json({ error: "Missing 'audio' (base64) field." }, { status: 400 });
  }

  const mode = resolveMode(body.mode);
  const language = resolveLanguage(body.language);
  const format = (body.format || "wav").replace(/[^a-z0-9]/gi, "") || "wav";

  let transcript: string;
  let provider: string;
  try {
    if (groqKey) {
      transcript = await transcribeWithGroq(audio, language);
      provider = "groq:whisper";
    } else {
      transcript = await transcribeWithOpenRouter(audio, format, openRouterKey as string);
      provider = "openrouter:audio";
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 });
  }

  if (mode === "transcript") {
    return NextResponse.json({ text: transcript, provider });
  }

  const attempts: Array<{ name: string; fn: () => Promise<string> }> = [];
  if (groqKey) {
    attempts.push({
      name: "groq:chat",
      fn: () => summarizeWithGroq(transcript, mode, language, groqKey),
    });
  }
  if (openRouterKey) {
    attempts.push({
      name: "openrouter:chat",
      fn: () => summarizeWithOpenRouter(transcript, mode, language, openRouterKey),
    });
  }

  const warnings: string[] = [];
  for (const attempt of attempts) {
    try {
      const text = await attempt.fn();
      return NextResponse.json({ text, provider, summarizedBy: attempt.name });
    } catch (err) {
      warnings.push(`${attempt.name}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({ text: transcript, provider, warning: warnings.join(" | ") });
}