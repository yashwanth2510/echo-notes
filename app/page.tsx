import Recorder from "@/components/Recorder";

export default function Home() {
  return (
    <main className="wrap">
      <div className="brandbar">
        <div className="logo">🎙️</div>
        <div>
          <div className="brand-name">Echo Notes</div>
          <div className="brand-sub">Voice notes → transcripts, summaries &amp; action items</div>
        </div>
      </div>

      <h1>Turn any conversation into clean notes.</h1>
      <p className="lead">
        Record a voice note, meeting, or class — in English, Hindi, or Hinglish — and get a
        transcript, a summary, and action items in seconds. Powered by OpenRouter, hosted for free.
      </p>

      <Recorder />

      <p className="foot">
        Your audio is sent to OpenRouter for processing and is not stored on our servers.
        Recent notes are saved only in your browser (localStorage).
      </p>
    </main>
  );
}
