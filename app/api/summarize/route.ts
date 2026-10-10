import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

type Mode = "mom" | "summary" | "transcript" | "action";

type RequestBody = {
  audio?: string;
  format?: string;
  mode?: Mode;
  language?: string;
};

const SYSTEM_PROMPTS: Record<Mode, string> = {
  mom: `You are an expert meeting-notes assistant. You will receive an audio recording (a voice note or meeting).
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

Transcribe faithfully. Do not invent details that were not in the audio. Write "Unclear" if something is inaudible.`,
  summary: `You are an expert note-taker. You will receive an audio recording.
Produce a Markdown response with:
# <short title>
## Summary
A 3-6 sentence overview.
## Key Points
Bullet points of the important ideas.
Do not invent details that were not in the audio.`,
  transcript: `You are a precise transcription engine. Transcribe the audio exactly as spoken.
Output only the transcript as plain text. Include speaker labels (Speaker 1, Speaker 2, ...) only if you can reliably tell speakers apart. Do not summarize.`,
  action: `You are an action-item extractor. You will receive an audio recording.
Output a Markdown response with only:
## Action Items
A Markdown table with columns: | Action | Owner | Due |.
Plus a short "## Follow-ups" bullet list if there are unresolved questions.
Do not invent details that were not in the audio.`,
};

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  auto: "Detect the spoken language automatically. Write the output in the same language that was spoken.",
  en: "Write the entire output in English, translating if the audio is in another language. Also include the original-language transcript if it is not English.",
  hi: "Write the entire output in Hindi (Devanagari), translating if needed. Keep action-item owners as spoken.",
  hinglish:
    "Write the summary in natural Hinglish (Hindi written in Latin script) if the audio is Hinglish, otherwise keep the spoken language.",
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not set. Add it to .env.local and restart the dev server." },
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

  const mode: Mode =
    body.mode && body.mode in SYSTEM_PROMPTS ? body.mode : "mom";
  const language = body.language && body.language in LANGUAGE_INSTRUCTIONS ? body.language : "auto";
  const format = (body.format || "wav").replace(/[^a-z0-9]/gi, "") || "wav";

  const model = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";

  const userText = [
    "Process the attached audio recording as instructed.",
    `Output language rule: ${LANGUAGE_INSTRUCTIONS[language]}`,
  ].join("\n");

  const payload = {
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: SYSTEM_PROMPTS[mode] },
      {
        role: "user",
        content: [
          { type: "text", text: userText },
          { type: "input_audio", input_audio: { data: audio, format } },
        ],
      },
    ],
  };

  let res: Response;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title": process.env.SITE_NAME || "Echo Notes",
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to reach OpenRouter: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const raw = await res.text();
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message =
      data?.error?.message || data?.error || raw.slice(0, 500) || `OpenRouter HTTP ${res.status}`;
    return NextResponse.json({ error: message }, { status: res.status });
  }

  const text: string | undefined =
    data?.choices?.[0]?.message?.content ??
    (Array.isArray(data?.choices?.[0]?.message?.content)
      ? data.choices[0].message.content.map((c: any) => c?.text ?? "").join("")
      : undefined);

  if (!text) {
    return NextResponse.json(
      { error: "The model returned an empty response. Try a shorter recording or another model." },
      { status: 502 },
    );
  }

  return NextResponse.json({ text, model });
}
