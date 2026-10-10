"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.87Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.96H1.28v3.09A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.88 12c0-.79.14-1.56.4-2.28V6.63H1.28a12 12 0 0 0 0 10.74l4-3.09Z" />
      <path fill="#EA4335" d="M12 4.76c1.76 0 3.34.61 4.58 1.8l3.44-3.44A11.95 11.95 0 0 0 1.28 6.63l4 3.09C6.22 6.87 8.87 4.76 12 4.76Z" />
    </svg>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const [status, setStatus] = useState<"loading" | "signedout" | "signedin">("loading");
  const [user, setUser] = useState<{ email?: string; user_metadata?: { name?: string } } | null>(null);

  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    if (!configured) return;
    const client = createClient();
    supabaseRef.current = client;

    client.auth.getSession().then(({ data }) => {
      const session = data.session;
      setUser(session?.user ?? null);
      setStatus(session ? "signedin" : "signedout");
    });
  }, [configured]);

  if (!configured) {
    return <>{children}</>;
  }

  if (status === "loading") {
    return <div className="card auth-panel">Checking session…</div>;
  }

  if (status === "signedin") {
    return (
      <div className="auth-wrap">
        <div className="auth-bar">
          <span className="user-chip">{user?.user_metadata?.name ?? user?.email ?? "Signed in"}</span>
          <button
            className="btn-landing btn-landing-ghost btn-signout"
            onClick={async () => {
              await supabaseRef.current?.auth.signOut();
              setUser(null);
              setStatus("signedout");
              router.refresh();
            }}
          >
            Sign out
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="card auth-panel">
      <h3>Sign in to create &amp; save notes</h3>
      <p className="muted">
        Sign in with Google to record, summarize, and store your notes privately in your account.
      </p>
      <button
        className="btn-google"
        onClick={async () => {
          const client = supabaseRef.current ?? createClient();
          supabaseRef.current = client;
          await client.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
          });
        }}
      >
        <GoogleIcon /> Continue with Google
      </button>
    </div>
  );
}