"use client";

import { encodeWav } from "@/lib/audio";
import { PROMPTS, languageInstruction } from "@/lib/local-ai";

export type CloudConfig = {
  baseUrl: string;
  apiKey: string;
  asrModel: string;
  chatModel: string;
};

export type EngineMode = "cloud" | "local";

export const PRESET_PROVIDERS: {
  label: string;
  baseUrl: string;
  asrModel: string;
  chatModel: string;
}[] = [
  {
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    asrModel: "whisper-1",
    chatModel: "gpt-4o-mini",
  },
  {
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    asrModel: "whisper-large-v3",
    chatModel: "llama-3.3-70b-versatile",
  },
];

const CONFIG_KEY = "echo-notes-cloud-v1";
const ENGINE_KEY = "echo-notes-engine-v1";

export function loadCloudConfig(): CloudConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const cfg = JSON.parse(raw) as Partial<CloudConfig>;
    if (!cfg.apiKey) return null;
    return {
      baseUrl: cfg.baseUrl || "https://api.openai.com/v1",
      apiKey: cfg.apiKey,
      asrModel: cfg.asrModel || "whisper-1",
      chatModel: cfg.chatModel || "gpt-4o-mini",
    };
  } catch {
    return null;
  }
}

export function saveCloudConfig(cfg: CloudConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function clearCloudConfig(): void {
  localStorage.removeItem(CONFIG_KEY);
}

export function loadEnginePref(): EngineMode {
  try {
    return localStorage.getItem(ENGINE_KEY) === "local" ? "local" : "cloud";
  } catch {
    return "cloud";
  }
}

export function saveEnginePref(mode: EngineMode): void {
  try {
    localStorage.setItem(ENGINE_KEY, mode);
  } catch {
    /* ignore */
  }
}

function apiUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}${path}`;
}

function hostName(base: string): string {
  try {
    return new URL(base).hostname;
  } catch {
    return base;
  }
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.text().catch(() => "");
  try {
    const j = JSON.parse(body);
    const msg = j?.error?.message || j?.message;
    if (typeof msg === "string") return msg.slice(0, 300);
  } catch {
    /* not json */
  }
  return (body || res.statusText).slice(0, 300);
}

export async function transcribeCloud(
  samples: Float32Array,
  language: string,
  cfg: CloudConfig
): Promise<string> {
  if (!cfg.asrModel) {
    throw new Error("No transcription model set. Open Settings and set one (e.g. whisper-1).");
  }

  const wav = encodeWav(samples, 16000);
  const form = new FormData();
  form.append("file", wav, "recording.wav");
  form.append("model", cfg.asrModel);
  form.append("response_format", "text");

  const lang =
    language === "auto" ? undefined : language === "hinglish" ? "hi" : language;
  if (lang) form.append("language", lang);

  const res = await fetch(apiUrl(cfg.baseUrl, "/audio/transcriptions"), {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.apiKey}` },
    body: form,
  });
  if (!res.ok) {
    throw new Error(`Transcription failed (${res.status} ${hostName(cfg.baseUrl)}): ${await errorMessage(res)}`);
  }
  const text = (await res.text()).trim();
  if (!text) throw new Error("Transcription returned an empty result.");
  return text;
}

const SYSTEM_PROMPT =
  "You are an expert meeting assistant. Follow the instructions precisely and return only the requested output with no preamble.";

export async function summarizeCloud(
  transcript: string,
  mode: string,
  language: string,
  cfg: CloudConfig
): Promise<string> {
  const instruction = PROMPTS[mode] ?? PROMPTS.mom;
  const user = `${instruction}\n\n${languageInstruction(language)}\n\nTranscript:\n${transcript}`;

  const res = await fetch(apiUrl(cfg.baseUrl, "/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.chatModel,
      temperature: 0.5,
      max_tokens: 800,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Notes request failed (${res.status} ${hostName(cfg.baseUrl)}): ${await errorMessage(res)}`);
  }
  const data = await res.json();
  const text = (data?.choices?.[0]?.message?.content ?? "").trim();
  if (!text) throw new Error("Notes request returned an empty result.");
  return text;
}