import type { ReactNode } from "react";
import Recorder from "@/components/Recorder";
import AuthGate from "@/components/AuthGate";

function LogoIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
    </svg>
  );
}

function FeatureIcon({ children }: { children: ReactNode }) {
  return (
    <div className="feature-icon">
      <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <nav className="nav">
        <div className="nav-inner">
          <div className="brandbar nav-brand">
            <div className="logo"><LogoIcon /></div>
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
          <div className="pill">Free · No install · 45+ languages</div>
          <h1>
            Speak.
            <br />
            Get <span className="grad">Minutes of Meeting</span>.
          </h1>
          <p className="lead hero-lead">
            Record a voice note, a meeting, or a class. Echo Notes transcribes it and turns it
            into a clean summary with decisions and action items —{" "}
            <strong>online via the AI provider you choose</strong>, or{" "}
            <strong>fully on your device</strong> and offline.
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
          <p>Record or upload — get the exact output you want.</p>
        </div>
        <AuthGate>
          <Recorder />
        </AuthGate>
      </section>

      <section className="wrap" id="features">
        <div className="anchor" />
        <div className="section-title">
          <h2>Why Echo Notes?</h2>
        </div>
        <div className="features">
          <div className="feature-card">
            <FeatureIcon>
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
            </FeatureIcon>
            <h3>Speak your notes</h3>
            <p>Meetings, ideas, lectures, dictation — record and let on-device AI transcribe accurately, right where you are.</p>
          </div>
          <div className="feature-card">
            <FeatureIcon>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
              <path d="M14 2v6h6" />
              <line x1="9" y1="14" x2="15" y2="14" />
              <line x1="9" y1="18" x2="13" y2="18" />
            </FeatureIcon>
            <h3>MOM + action items</h3>
            <p>Automatic summary, key points, decisions, and an owner/due-date action table.</p>
          </div>
          <div className="feature-card">
            <FeatureIcon>
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z" />
            </FeatureIcon>
            <h3>45+ languages</h3>
            <p>Hindi, Tamil, Bengali, Spanish, Arabic, Japanese and 40 more.</p>
          </div>
          <div className="feature-card">
            <FeatureIcon>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </FeatureIcon>
            <h3>Private by choice</h3>
            <p>On-device mode keeps everything on your device; online mode sends audio only to the AI provider you connect.</p>
          </div>
          <div className="feature-card">
            <FeatureIcon>
              <line x1="19" y1="5" x2="5" y2="19" />
              <circle cx="6.5" cy="6.5" r="2.5" />
              <circle cx="17.5" cy="17.5" r="2.5" />
            </FeatureIcon>
            <h3>Free</h3>
            <p>No subscriptions, no credit card, no mandatory account. Use the free on-device mode, or bring your own AI key.</p>
          </div>
          <div className="feature-card">
            <FeatureIcon>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </FeatureIcon>
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
            <p>Your voice becomes text in 45+ languages — via your connected AI service or an on-device speech engine.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Get your MOM</h3>
            <p>An AI model writes the summary, decisions, and action items — online with your provider, or locally with no cloud needed.</p>
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
              <li>All outputs: MOM, summary, key points &amp; more</li>
              <li>45+ languages</li>
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
            Built with Next.js · Online AI, or on-device offline processing.
            <br />
            Your notes are yours — use your own AI provider or keep everything on your device.
          </p>
      </footer>
    </main>
  );
}