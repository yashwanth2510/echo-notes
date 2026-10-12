"use strict";

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PROMPTS, languageInstruction } = require("../lib/prompts");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const OUT = path.resolve(__dirname, "..", "..", "out");

const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_API_BASE = (process.env.AI_API_BASE || "https://api.groq.com/openai/v1").replace(
  /\/+$/,
  ""
);
const AI_TRANSCRIBE_MODEL = process.env.AI_TRANSCRIBE_MODEL || "whisper-large-v3";
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || "llama-3.3-70b-versatile";
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS ||
  "https://echo-notes-ap43.onrender.com,https://localhost,http://localhost"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function providerHost() {
  try {
    return new URL(AI_API_BASE).hostname.replace(/^api\./, "");
  } catch {
    return AI_API_BASE;
  }
}

app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/config", (req, res) => {
  res.json({
    available: Boolean(AI_API_KEY),
    provider: providerHost(),
    asrModel: AI_TRANSCRIBE_MODEL,
    chatModel: AI_CHAT_MODEL,
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 64 * 1024 * 1024 },
});

app.post("/api/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!AI_API_KEY) return res.status(503).json({ error: "AI is not configured on the server yet." });
    if (!req.file) return res.status(400).json({ error: "Missing audio file." });

    const language = req.body.language;
    const lang =
      language && language !== "auto"
        ? language === "hinglish"
          ? "hi"
          : language
        : undefined;

    const form = new FormData();
    form.append("model", AI_TRANSCRIBE_MODEL);
    form.append("response_format", "text");
    if (lang) form.append("language", lang);
    form.append("file", new Blob([req.file.buffer], { type: req.file.mimetype }), "recording.wav");

    const provider = await fetch(`${AI_API_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_API_KEY}` },
      body: form,
    });
    const text = (await provider.text()).trim();
    if (!provider.ok) {
      return res.status(502).json({ error: `Provider error (${provider.status}): ${text.slice(0, 400)}` });
    }
    if (!text) return res.status(502).json({ error: "Provider returned an empty transcript." });
    res.json({ text });
  } catch (err) {
    console.error("transcribe error", err);
    res.status(500).json({ error: (err && err.message) || "Transcription failed." });
  }
});

app.post("/api/notes", async (req, res) => {
  try {
    if (!AI_API_KEY) return res.status(503).json({ error: "AI is not configured on the server yet." });
    const body = req.body || {};
    const transcript = String(body.transcript || "").trim();
    const mode = String(body.mode || "mom");
    const language = String(body.language || "en");
    if (!transcript) return res.status(400).json({ error: "Missing transcript." });

    const instruction = PROMPTS[mode] || PROMPTS.mom;
    const user = `${instruction}\n\n${languageInstruction(language)}\n\nTranscript:\n${transcript}`;

    const provider = await fetch(`${AI_API_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_CHAT_MODEL,
        temperature: 0.5,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content:
              "You are an expert meeting assistant. Follow the instructions precisely and return only the requested output with no preamble.",
          },
          { role: "user", content: user },
        ],
      }),
    });
    const data = await provider.json().catch(() => ({}));
    const text = (data?.choices?.[0]?.message?.content ?? "").trim();
    if (!provider.ok) {
      return res.status(502).json({
        error: `Provider error (${provider.status}): ${(data?.error?.message || "").slice(0, 400) || provider.statusText}`,
      });
    }
    if (!text) return res.status(502).json({ error: "Provider returned an empty reply." });
    res.json({ text });
  } catch (err) {
    console.error("notes error", err);
    res.status(500).json({ error: (err && err.message) || "Notes generation failed." });
  }
});

app.use(express.static(OUT));

app.get("*", (req, res) => {
  const file = path.join(OUT, "index.html");
  if (fs.existsSync(file)) return res.sendFile(file);
  res.status(404).send("Not found");
});

app.listen(PORT, () => {
  console.log(`Echo Notes server on http://localhost:${PORT} (AI ${AI_API_KEY ? "configured" : "not configured"})`);
});