"use client";

import { useEffect, useRef, useState } from "react";
import { decodeToPcm16k, formatDuration } from "@/lib/audio";
import { LANGUAGES } from "@/lib/languages";
import { createClient } from "@/lib/supabase/client";
import {
  transcribe,
  summarize,
  type ModelProgress,
} from "@/lib/local-ai";

type Mode = "mom" | "summary" | "keypoints" | "decisions" | "transcript" | "action";
type Status = "idle" | "recording" | "processing";
type Step = "" | "decoding" | "transcribing" | "summarizing";

type HistoryEntry = {
  id: string;
  title: string;
  text: string;
  mode: Mode;
  language: string;
  date: string;
};

const STORAGE_KEY = "echo-notes-history-v1";

const MODES: { value: Mode; label: string }[] = [
  { value: "mom", label: "Minutes of Meeting (full)" },
  { value: "summary", label: "Summary" },
  { value: "keypoints", label: "Key Points" },
  { value: "decisions", label: "Decisions" },
  { value: "action", label: "Action Items" },
  { value: "transcript", label: "Transcript" },
];

const STEP_LABELS: Record<string, string> = {
  decoding: "Converting audio…",
  transcribing: "Transcribing on this device…",
  summarizing: "Writing your notes…",
  downloading: "Downloading AI models…",
};

function formatBytes(bytes: number): string {
  if (!bytes) return "0 MB";
  const mb = bytes / (1024 * 1024);
  return mb > 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

export default function Recorder() {
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [mode, setMode] = useState<Mode>("mom");
  const [language, setLanguage] = useState("en");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [usedProvider, setUsedProvider] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [step, setStep] = useState<Step>("");
  const [progress, setProgress] = useState<ModelProgress | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const hasSupabase =
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
      Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    if (hasSupabase) {
      const supabase = createClient();
      supabaseRef.current = supabase;
      supabase.auth.getSession().then(({ data }) => {
        const user = data.session?.user ?? null;
        setUserId(user?.id ?? null);
        if (user) {
          supabase
            .from("notes")
            .select("id,title,text,mode,language,created_at")
            .order("created_at", { ascending: false })
            .limit(25)
            .then(({ data: rows, error }) => {
              if (error) {
                setLoadError(`Could not load saved notes: ${error.message}`);
                return;
              }
              if (rows) {
                setHistory(
                  rows.map((r) => ({
                    id: r.id,
                    title: r.title,
                    text: r.text,
                    mode: r.mode as Mode,
                    language: r.language,
                    date: new Date(r.created_at).toLocaleString(),
                  }))
                );
              }
            });
        }
      });
    }
    if (!hasSupabase || !userId) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) setHistory(JSON.parse(raw) as HistoryEntry[]);
      } catch {
        /* ignore */
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [userId]);

  useEffect(() => {
    if (status !== "recording" || !streamRef.current || !canvasRef.current) return;
    const AudioCtor = window.AudioContext as typeof AudioContext | undefined;
    const Ctor = AudioCtor || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;

    const audioCtx = new Ctor();
    const source = audioCtx.createMediaStreamSource(streamRef.current);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);

    const canvas = canvasRef.current;
    const ctx2d = canvas.getContext("2d");
    const freq = new Uint8Array(analyser.frequencyBinCount);
    const bars = 28;
    let raf = 0;

    const draw = () => {
      analyser.getByteFrequencyData(freq);
      if (ctx2d) {
        const { width: w, height: h } = canvas;
        ctx2d.clearRect(0, 0, w, h);
        const gap = 4;
        const bw = (w - gap * (bars - 1)) / bars;
        for (let i = 0; i < bars; i += 1) {
          const v = freq[i] / 255;
          const bh = Math.max(4, Math.round(v * h * 0.92));
          ctx2d.fillStyle = "#111111";
          ctx2d.fillRect(i * (bw + gap), h - bh, bw, bh);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      void audioCtx.close();
    };
  }, [status]);

  const startTimer = () => {
    setSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const saveNote = async (entry: HistoryEntry) => {
    const supabase = supabaseRef.current;
    if (supabase && userId) {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: userId,
          title: entry.title,
          text: entry.text,
          mode: entry.mode,
          language: entry.language,
        })
        .select("id")
        .single();
      if (error) {
        setError(`Note was created but could not be saved: ${error.message}`);
        return;
      }
      setHistory((prev) => [{ ...entry, id: data.id }, ...prev]);
    } else {
      const next = [entry, ...history].slice(0, 25);
      setHistory(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    }
  };

  const deleteNote = async (id: string) => {
    const supabase = supabaseRef.current;
    if (supabase && userId) {
      await supabase.from("notes").delete().eq("id", id);
    }
    setHistory((prev) => prev.filter((h) => h.id !== id));
  };

  const clearHistory = async () => {
    const supabase = supabaseRef.current;
    if (supabase && userId) {
      await supabase.from("notes").delete().eq("user_id", userId);
    }
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const startRecording = async () => {
    setError("");
    setResult("");
    setUsedProvider("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        void processBlob(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
      startTimer();
    } catch (err) {
      setError(
        `Could not access the microphone: ${(err as Error).message}. Check browser permissions.`,
      );
    }
  };

  const stopRecording = () => {
    stopTimer();
    mediaRecorderRef.current?.stop();
    setStatus("processing");
  };

  const onFilePicked = async (file: File) => {
    setError("");
    setResult("");
    setUsedProvider("");
    setStatus("processing");
    await processBlob(file);
  };

  const processBlob = async (blob: Blob) => {
    setStatus("processing");
    setError("");
    setProgress(null);
    try {
      setStep("decoding");
      const { samples } = await decodeToPcm16k(blob);

      setStep("transcribing");
      const onProgress = (p: ModelProgress) => {
        // transformers.js v4 streams initiate/download/progress_total/progress events.
        // Normalize any of them into a single "downloading" state for the progress bar.
        if (p.status === "initiate" || p.status === "download" || p.status === "progress_total" || p.status === "progress" || p.status === "done") {
          setProgress((prev) => ({
            status: "download",
            file: p.file || prev?.file || "model files",
            loaded: p.loaded,
            total: p.total,
            progress: Math.min(1, p.progress ?? prev?.progress ?? 0),
          }));
        }
      };
      const transcript = await transcribe(samples, language, onProgress);
      setProgress(null);

      let text = transcript;
      if (mode !== "transcript") {
        setStep("summarizing");
        text = await summarize(transcript, mode, language, onProgress);
        setProgress(null);
        if (!text) text = transcript;
      }

      setResult(text);
      setUsedProvider("runs on this device · nothing leaves your browser");

      const firstLine =
        text
          .split("\n")
          .map((l) => l.replace(/^#+\s*/, "").trim())
          .find((l) => l.length > 0) || "Voice note";
      const entry: HistoryEntry = {
        id: String(Date.now()),
        title: firstLine.slice(0, 70),
        text,
        mode,
        language,
        date: new Date().toLocaleString(),
      };
      void saveNote(entry);
    } catch (err) {
      setError(
        `${(err as Error).message} If this is the first run, the AI models are downloading — try again in a minute.`,
      );
    } finally {
      setStatus("idle");
      setSeconds(0);
      setStep("");
      setProgress(null);
    }
  };

  const copyResult = async () => {
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      /* ignore */
    }
  };

  const downloadResult = () => {
    const blob = new Blob([result], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `echo-notes-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const busy = status === "processing";
  const downloading = progress && progress.status === "download";

  return (
    <div>
      <div className="card">
        <div className="row">
          <label className="field">
            Output
            <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} disabled={status !== "idle"}>
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Language
            <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={status !== "idle"}>
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {status === "recording" && (
          <canvas ref={canvasRef} className="spectrum" width={600} height={90} />
        )}

        <div className="controls">
          {status === "idle" && (
            <>
              <button className="btn-record" onClick={startRecording}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                  <path d="M12 2a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Zm6 9a1 1 0 0 1 1 1v1a7 7 0 0 1-6 6.93V22a1 1 0 1 1-2 0v-1.07A7 7 0 0 1 5 13v-1a1 1 0 1 1 2 0v1a5 5 0 0 0 10 0v-1a1 1 0 0 1 1-1Z" />
                </svg>
                Start recording
              </button>
              <button className="btn-ghost" onClick={() => fileInputRef.current?.click()}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload audio file
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFilePicked(f);
                  e.target.value = "";
                }}
              />
            </>
          )}

          {status === "recording" && (
            <>
              <button className="btn-stop" onClick={stopRecording}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="6" width="12" height="12" rx="1.5" />
                </svg>
                Stop &amp; create notes
              </button>
              <span className="timer">
                <span className="recording-dot" />
                {formatDuration(seconds)}
              </span>
            </>
          )}

          {busy && (
            <div className="processing">
              {" "}
              {downloading ? (
                <>
                  <span className="timer-small">
                    <span className="spinner" /> Downloading AI models (first run only)…
                  </span>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${Math.min(100, Math.round((progress?.progress || 0) * 100))}%`,
                      }}
                    />
                  </div>
                  {progress && progress.total > 0 && (
                    <small className="progress-meta">
                      {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
                    </small>
                  )}
                </>
              ) : (
                <span className="timer">
                  <span className="spinner" /> {STEP_LABELS[step] || "Working…"}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="hint">
          <p>
            <strong>Everything runs on this device.</strong> Your voice never leaves your browser.
            Models download once and are cached. Choose{" "}
            <strong>Transcript</strong> as the output to skip the summary model entirely
            (fastest — ~75&nbsp;MB download); other outputs also download a ~490&nbsp;MB summary
            model on first use.
          </p>
          <p>
            Browser transcription can't auto-detect languages, so pick your language above for
            best accuracy (English is the default). Speak clearly and record one meeting at a time;
            longer recordings take longer on less powerful machines.
          </p>
        </div>

        {error && <div className="status error">{error}</div>}
        {!error && status === "idle" && result && (
          <div className="status">Done{usedProvider ? ` · ${usedProvider}` : ""}.</div>
        )}
      </div>

      {result && (
        <>
          <div className="result-head">
            <h2>Your notes</h2>
            <div className="controls result-controls">
              <button className="btn-ghost mini" onClick={copyResult}>
                Copy
              </button>
              <button className="btn-ghost mini" onClick={downloadResult}>
                Download .md
              </button>
            </div>
          </div>
          <pre className="output">{result}</pre>
        </>
      )}

      {loadError && <div className="status error">{loadError}</div>}

      {history.length > 0 && (
        <>
          <div className="divider" />
          <div className="result-head">
            <h2>Recent notes</h2>
            <button className="btn-ghost mini" onClick={() => void clearHistory()}>
              Clear
            </button>
          </div>
          {history.map((h) => (
            <div className="history-item" key={h.id}>
              <span>
                {h.title} <span className="pill">{h.mode}</span>
                <br />
                <small>{h.date}</small>
              </span>
              <div className="history-actions">
                <button className="btn-ghost" onClick={() => setResult(h.text)}>
                  Open
                </button>
                <button className="btn-ghost danger" onClick={() => void deleteNote(h.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}