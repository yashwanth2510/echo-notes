"use client";

export type Pcm16k = {
  samples: Float32Array;
  durationSec: number;
  sampleRate: number;
};

const TARGET_SAMPLE_RATE = 16000;

function getAudioContextCtor(): typeof AudioContext {
  const w = window as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = w.AudioContext || w.webkitAudioContext;
  if (!Ctor) {
    throw new Error("This browser does not support the Web Audio API.");
  }
  return Ctor;
}

export async function decodeToPcm16k(blob: Blob): Promise<Pcm16k> {
  const arrayBuffer = await blob.arrayBuffer();

  const AudioCtx = getAudioContextCtor();
  const decodeCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    void decodeCtx.close();
  }

  const targetLength = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, targetLength, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();

  return {
    samples: rendered.getChannelData(0).slice(0),
    durationSec: decoded.duration,
    sampleRate: TARGET_SAMPLE_RATE,
  };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}