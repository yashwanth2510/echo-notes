"use client";

import { encodeWav } from "@/lib/audio";
import { PROMPTS, languageInstruction } from "@/lib/prompts";

export type EngineMode = "cloud" | "local";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/+$/, "");

function endpoint(path: string): string {
  return API_BASE ? `${API_BASE}${path}` : path;
}

export type BackendStatus = {
  available: boolean;
  provider: string;
  asrModel: string;
  chatModel: string;
};

export async function getBackendStatus(): Promise<BackendStatus | null> {
  try {
    const res = await fetch(endpoint("/api/config"), { method: "GET" });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<BackendStatus>;
    return {
      available: Boolean(data.available),
      provider: String(data.provider || ""),
      asrModel: String(data.asrModel || ""),
      chatModel: String(data.chatModel || ""),
    };
  } catch {
    return null;
  }
}

export async function transcribeCloud(
  samples: Float32Array,
  language: string
): Promise<string> {
  const wav = encodeWav(samples, 16000);
  const form = new FormData();
  form.append("file", wav, "recording.wav");
  form.append("language", language);

  const res = await fetch(endpoint("/api/transcribe"), {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const msg = await errorMessage(res);
    throw new Error(`Transcription failed (${res.status}): ${msg}`);
  }
  const data = await res.json();
  const text = (data?.text ?? "").trim();
  if (!text) throw new Error("Transcription returned an empty result.");
  return text;
}

const SYSTEM_PROMPT =
  "You are an expert meeting assistant. Follow the instructions precisely and return only the requested output with no preamble.";

export async function summarizeCloud(
  transcript: string,
  mode: string,
  language: string
): Promise<string> {
  const instruction = PROMPTS[mode] ?? PROMPTS.mom;
  const user = `${instruction}\n\n${languageInstruction(language)}\n\nTranscript:\n${transcript}`;

  const res = await fetch(endpoint("/api/notes"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript,
      mode,
      language,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const msg = await errorMessage(res);
    throw new Error(`Notes request failed (${res.status}): ${msg}`);
  }
  const data = await res.json();
  const text = (data?.text ?? "").trim();
  if (!text) throw new Error("Notes request returned an empty result.");
  return text;
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  try {
    const j = JSON.parse(body);
    if (typeof j?.error === "string") return j.error.slice(0, 300);
    const msg = j?.error?.message || j?.detail || j?.message;
    if (typeof msg === "string") return msg.slice(0, 300);
  } catch {
    /* not json */
  }
  return (body || res.statusText).slice(0, 300);
}