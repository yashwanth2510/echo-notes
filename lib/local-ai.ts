"use client";

import { LANGUAGE_NAMES } from "@/lib/languages";

export const WHISPER_MODEL =
  process.env.NEXT_PUBLIC_WHISPER_MODEL || "onnx-community/whisper-large-v3-turbo";
export const WHISPER_DTYPE = process.env.NEXT_PUBLIC_WHISPER_DTYPE || "q4f16";
export const LLM_MODEL =
  process.env.NEXT_PUBLIC_LLM_MODEL || "onnx-community/Qwen2.5-0.5B-Instruct";
export const LLM_DTYPE = process.env.NEXT_PUBLIC_LLM_DTYPE || "q8";
export const DEVICE = process.env.NEXT_PUBLIC_TRANSFORMER_DEVICE || "wasm";
export const WASM_PATH = process.env.NEXT_PUBLIC_WASM_PATH || "";

export type ModelProgress = {
  file: string;
  loaded: number;
  total: number;
  progress: number;
  status: string;
};

type HFModule = {
  env: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
  };
  pipeline: (
    task: string,
    model: string,
    options?: Record<string, unknown>
  ) => Promise<unknown>;
};

const isBrowser =
  typeof window !== "undefined" && typeof document !== "undefined";

let hfPromise: Promise<HFModule> | null = null;

async function getHF(): Promise<HFModule> {
  if (!hfPromise) {
    hfPromise = import("@huggingface/transformers").then((m) => {
      m.env.allowLocalModels = false;
      m.env.useBrowserCache = true;
      if (WASM_PATH) {
        try {
          (m.env as unknown as {
            backends: { onnx: { wasm: { wasmPaths: string } } };
          }).backends.onnx.wasm.wasmPaths = WASM_PATH;
        } catch {
          // Older/newer runtime layout; ignore and use default CDN paths.
        }
      }
      return m as unknown as HFModule;
    });
  }
  return hfPromise;
}

let asrPromise: Promise<unknown> | null = null;
let genPromise: Promise<unknown> | null = null;

async function loadAsr(onProgress?: (p: ModelProgress) => void): Promise<unknown> {
  if (!asrPromise) {
    asrPromise = getHF().then(async (hf) => {
      try {
        return await hf.pipeline("automatic-speech-recognition", WHISPER_MODEL, {
          dtype: WHISPER_DTYPE,
          device: DEVICE,
          progress_callback: (p: ModelProgress) => onProgress?.(p),
        });
      } catch (err) {
        // Quantized weights not available for this dtype? Fall back to defaults.
        asrPromise = null;
        try {
          return await hf.pipeline("automatic-speech-recognition", WHISPER_MODEL, {
            device: DEVICE,
            progress_callback: (p: ModelProgress) => onProgress?.(p),
          });
        } catch (err2) {
          throw err2 ?? err;
        }
      }
    });
  }
  return asrPromise;
}

async function loadLlm(onProgress?: (p: ModelProgress) => void): Promise<unknown> {
  if (!genPromise) {
    genPromise = getHF().then(async (hf) => {
      try {
        return await hf.pipeline("text-generation", LLM_MODEL, {
          dtype: LLM_DTYPE,
          device: DEVICE,
          progress_callback: (p: ModelProgress) => onProgress?.(p),
        });
      } catch (err) {
        // Quantized weights not available for this dtype? Fall back to defaults.
        genPromise = null;
        try {
          return await hf.pipeline("text-generation", LLM_MODEL, {
            device: DEVICE,
            progress_callback: (p: ModelProgress) => onProgress?.(p),
          });
        } catch (err2) {
          throw err2 ?? err;
        }
      }
    });
  }
  return genPromise;
}

export function needsModels(): boolean {
  return isBrowser;
}

export async function transcribe(
  samples: Float32Array,
  language: string,
  onProgress?: (p: ModelProgress) => void
): Promise<string> {
  const asr = (await loadAsr(onProgress)) as (
    input: Float32Array,
    opts?: Record<string, unknown>
  ) => Promise<{ text?: string }>;

  const lang =
    language === "auto" ? undefined : language === "hinglish" ? "hi" : language;

  const opts: Record<string, unknown> = {
    task: "transcribe",
    chunk_length_s: 30,
    stride_length_s: 5,
    return_timestamps: false,
  };
  if (lang) opts.language = lang;

  const out = await asr(samples, opts);

  return (out?.text ?? "").trim();
}

function languageInstruction(language: string): string {
  const name = LANGUAGE_NAMES[language];
  if (!name) {
    return "Respond in the same language the transcript is mostly written in.";
  }
  if (language === "auto") {
    return "Respond in the same language as the transcript (detect it yourself).";
  }
  return `Respond in ${name}. Keep all names and numbers unchanged.`;
}

const PROMPTS: Record<string, string> = {
  mom: `You are writing the official Minutes of Meeting (MOM).
Produce a markdown report with exactly these sections:
## Summary
- 3 to 6 bullet points covering the gist.
## Discussion Highlights
- Bullet points of what was discussed.
## Decisions
- A markdown table: | Decision | Details | Status |. If no decision was made, write "—".
## Action Items
- A markdown table: | Action | Owner | Due date | Status |. If details are missing, write "—".

Do not invent facts not present in the transcript.`,
  summary: `Write a clean, concise summary of the transcript:
- Start with a single opening line capturing the topic.
- Follow with 3 to 8 markdown bullet points of the most important points.
No tables, no headings beyond the opening line.`,
  keypoints: `Extract the most important key points from the transcript as a markdown bullet list.
- Exactly 5 to 10 concise bullets.
- Use the speaker's own terms where possible.
- No tables, no headings.`,
  decisions: `List every decision made in the transcript.
- Present as a markdown table: | Decision | Details | Status |.
- Add the date if it was mentioned.
- If no explicit decision was made, reply with exactly: "No explicit decisions were made."`,
  action: `Extract all action items from the transcript.
- Present as a markdown table: | Action | Owner | Due date | Status |.
- If the owner or due date was not mentioned, write "—".
- If none exist, reply with exactly: "No action items were found."`,
};

export async function summarize(
  transcript: string,
  mode: string,
  language: string,
  onProgress?: (p: ModelProgress) => void
): Promise<string> {
  const gen = (await loadLlm(onProgress)) as (
    input: unknown,
    opts?: Record<string, unknown>
  ) => Promise<Array<{ generated_text: unknown }>>;

  const instruction = PROMPTS[mode] ?? PROMPTS.mom;
  const user = `${instruction}\n\n${languageInstruction(language)}\n\nTranscript:\n${transcript}`;
  const messages = [
    {
      role: "system",
      content:
        "You are an expert meeting assistant. Follow the instructions precisely and return only the requested output with no preamble.",
    },
    { role: "user", content: user },
  ];

  const out = await gen(messages, {
    max_new_tokens: 600,
    temperature: 0.5,
    top_p: 0.95,
    do_sample: true,
    repetition_penalty: 1.1,
  });

  const raw = out?.[0]?.generated_text;
  if (Array.isArray(raw)) {
    const last = [...raw].reverse().find(
      (m) => m && typeof m === "object" && m.role === "assistant" && typeof m.content === "string"
    ) as { content?: string } | undefined;
    if (last && last.content) return last.content.trim();
  }
  if (typeof raw === "string") return raw.trim();
  if (raw && typeof raw === "object") {
    const content = (raw as { content?: string }).content;
    if (typeof content === "string") return content.replace(/^assistant\s*/i, "").trim();
  }
  return "";
}