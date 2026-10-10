"use client";

import { useEffect, useRef, useState } from "react";
import { encodeBlobToWav, formatDuration } from "@/lib/audio";
import { LANGUAGES } from "@/lib/languages";

type Mode = "mom" | "summary" | "keypoints" | "decisions" | "transcript" | "action";
type Status = "idle" | "recording" | "processing";

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

export default function Recorder() {
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(0);
  const [mode, setMode] = useState<Mode>("mom");
  const [language, setLanguage] = useState("auto");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [usedProvider, setUsedProvider] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setHistory(JSON.parse(raw) as HistoryEntry[]);
    } catch {
      /* ignore */
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

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

  const persistHistory = (next: HistoryEntry[]) => {
    setHistory(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 25)));
    } catch {
      /* ignore */
    }
  };

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
    try {
      const encoded = await encodeBlobToWav(blob);
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio: encoded.base64,
          format: "wav",
          mode,
          language,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`);
      }
      setResult(data.text);
      setUsedProvider(
        [data.provider, data.summarizedBy].filter(Boolean).join(" + ") || "",
      );
      const firstLine =
        data.text
          .split("\n")
          .map((l: string) => l.replace(/^#+\s*/, "").trim())
          .find((l: string) => l.length > 0) || "Voice note";
      const entry: HistoryEntry = {
        id: String(Date.now()),
        title: firstLine.slice(0, 70),
        text: data.text,
        mode,
        language,
        date: new Date().toLocaleString(),
      };
      persistHistory([entry, ...history]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setStatus("idle");
      setSeconds(0);
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
            <span className="timer">
              <span className="spinner" />
              Transcribing &amp; summarizing…
            </span>
          )}
        </div>

        <div className="hint">
          Tip: speak clearly, one meeting per recording. 16&nbsp;kHz mono audio is used to keep
          uploads small. Recordings longer than ~5&nbsp;minutes may exceed free hosting upload limits.
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

      {history.length > 0 && (
        <>
          <div className="divider" />
          <div className="result-head">
            <h2>Recent notes</h2>
            <button className="btn-ghost mini" onClick={() => persistHistory([])}>
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
              <button className="btn-ghost" onClick={() => setResult(h.text)}>
                Open
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}