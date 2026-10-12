"use client";

import { PROMPTS, languageInstruction } from "@/lib/prompts";

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