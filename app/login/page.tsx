// web/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onLogin() {
    setMsg(null);
    setLoading(true);
    try {
      const eTrim = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: eTrim,
        password: pw,
      });
      if (error) throw error;

      if (!data.session) throw new Error("Failed to create login session");

      router.replace("/");
      router.refresh(); // refresh to update UI after login
    } catch (e: any) {
      setMsg(e?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSignUp() {
    setMsg(null);
    setLoading(true);
    try {
      const eTrim = email.trim().toLowerCase();
      if (!eTrim || !pw) {
        setMsg("Please provide email and password.");
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: eTrim,
        password: pw,
      });

      if (error) throw error;

      // If signup returns a session (when email confirmations are disabled), log the user in
      if (data.session) {
        router.replace("/");
        router.refresh();
        return;
      }

      // Otherwise, show a helpful message (check your email)
      setMsg(
        "Sign-up successful. Check your email to confirm your account (if required)."
      );
      setMode("login");
    } catch (e: any) {
      setMsg(e?.message ?? "Sign-up failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{mode === "login" ? "Login" : "Sign up"}</h1>
      <p style={{ opacity: 0.7, marginTop: 6 }}>
        Anyone can sign up and log in to use this service.
      </p>

      <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
        {msg ? (
          <div style={{ padding: 10, borderRadius: 8, background: "#f3f3f3" }}>{msg}</div>
        ) : null}

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          autoComplete="email"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 10 }}
        />
        <input
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 10 }}
        />

        {mode === "login" ? (
          <button
            onClick={onLogin}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: "black",
              color: "white",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        ) : (
          <button
            onClick={onSignUp}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid #ddd",
              background: "black",
              color: "white",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Signing up..." : "Create account"}
          </button>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 6 }}>
          {mode === "login" ? (
            <>
              <span style={{ opacity: 0.7 }}>Don't have an account?</span>
              <button onClick={() => setMode("signup")} style={{ color: "var(--cta)" }}>
                Sign up
              </button>
            </>
          ) : (
            <>
              <span style={{ opacity: 0.7 }}>Already have an account?</span>
              <button onClick={() => setMode("login")} style={{ color: "var(--cta)" }}>
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
