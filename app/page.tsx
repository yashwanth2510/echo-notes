import Recorder from "@/components/Recorder";

export default function Home() {
  return (
    <main>
      <nav className="nav">
        <div className="nav-inner">
          <div className="brandbar nav-brand">
            <div className="logo">🎙️</div>
            <div>
              <div className="brand-name">Echo Notes</div>
              <div className="brand-sub">Voice → notes</div>
            </div>
          </div>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how" className="nav-link">How it works</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#recorder" className="btn-nav">Open app</a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="wrap-narrow">
          <div className="pill">Free · No install · English / Hindi / Hinglish</div>
          <h1>
            Speak.
            <br />
            Get <span className="grad">Minutes of Meeting</span>.
          </h1>
          <p className="lead hero-lead">
            Record a voice note, a meeting, or a class. Echo Notes transcribes it and turns it
            into a clean summary with decisions and action items — right in your browser.
          </p>
          <div className="hero-cta">
            <a href="#recorder" className="btn-landing btn-landing-primary">Start recording</a>
            <a href="#how" className="btn-landing btn-landing-ghost">See how it works</a>
          </div>
        </div>
      </section>

      <section className="wrap">
        <div id="recorder" className="anchor" />
        <div className="section-title">
          <h2>Create your notes</h2>
          <p>Record or upload — get notes in seconds.</p>
        </div>
        <Recorder />
      </section>

      <section className="wrap" id="features">
        <div className="anchor" />
        <div className="section-title">
          <h2>Why Echo Notes?</h2>
        </div>
        <div className="features">
          <div className="feature-card">
            <div className="feature-icon">🗣️</div>
            <h3>Speak your notes</h3>
            <p>Meetings, ideas, lectures, dictation — record and let Whisper transcribe accurately.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📋</div>
            <h3>MOM + action items</h3>
            <p>Automatic summary, key decisions, and an owner/due-date action table.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>Multilingual</h3>
            <p>English, Hindi, Hinglish, and more with auto language detection.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Private by design</h3>
            <p>Your audio and keys stay server-side. History lives only in your browser.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">💸</div>
            <h3>Free</h3>
            <p>Free transcription and summarization on free-tier APIs. No credit card.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📤</div>
            <h3>Export anytime</h3>
            <p>Copy or download your notes as Markdown to share anywhere.</p>
          </div>
        </div>
      </section>

      <section className="wrap" id="how">
        <div className="anchor" />
        <div className="section-title">
          <h2>How it works</h2>
        </div>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Record</h3>
            <p>Hit record and speak — or upload an existing audio file.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Transcribe</h3>
            <p>Groq Whisper converts speech to text (English, Hindi, Hinglish…).</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Get your MOM</h3>
            <p>A GPT-class model writes the summary, decisions, and action items.</p>
          </div>
        </div>
      </section>

      <section className="wrap" id="pricing">
        <div className="anchor" />
        <div className="section-title">
          <h2>Pricing</h2>
        </div>
        <div className="pricing">
          <div className="price-card">
            <h3>Free</h3>
            <div className="price">₹0</div>
            <ul>
              <li>Up to 5 min per recording</li>
              <li>MOM, summary &amp; action items</li>
              <li>English / Hindi / Hinglish</li>
              <li>Browser history</li>
            </ul>
            <a href="#recorder" className="btn-landing btn-landing-primary">Start now</a>
          </div>
          <div className="price-card price-card-featured">
            <div className="pill">Coming soon</div>
            <h3>Pro</h3>
            <div className="price">₹299<span>/mo</span></div>
            <ul>
              <li>Long recordings &amp; meetings</li>
              <li>PDF/Word/email delivery</li>
              <li>Team workspaces</li>
              <li>Priority &amp; faster models</li>
            </ul>
            <span className="btn-landing btn-landing-ghost btn-disabled">Join waitlist</span>
          </div>
        </div>
      </section>

      <footer className="footer">
        <p>
          Built with Next.js · Transcribed by Groq Whisper · Summarized by GPT-class models.
          <br />
          Powered by your own API keys — you stay in control.
        </p>
      </footer>
    </main>
  );
}