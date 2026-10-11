"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallback() {
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = params.get("next") || "/";

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      setMessage("Sign-in isn't configured in this build.");
      return;
    }
    if (!code) {
      window.location.replace("/?auth=error");
      return;
    }

    const supabase = createClient();
    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          window.location.replace("/?auth=error");
        } else {
          window.location.replace(next);
        }
      })
      .catch(() => window.location.replace("/?auth=error"));
  }, []);

  return (
    <main>
      <div className="card auth-panel">{message}</div>
    </main>
  );
}
