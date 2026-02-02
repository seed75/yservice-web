// web/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), // ✅ 추천(대소문자 방지)
        password: pw,
      });
      if (error) throw error;

      if (!data.session) throw new Error("로그인 세션을 만들지 못했습니다.");

      router.replace("/");
      router.refresh(); // 핵심: 성공했는데 화면이 그대로인 문제 방지
    } catch (e: any) {
      alert(e?.message ?? "로그인 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Admin Login</h1>
      <p style={{ opacity: 0.7, marginTop: 6 }}>
        Owner 계정만 접근 가능합니다.
      </p>

      <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
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
          autoComplete="current-password"
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 10 }}
        />

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
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </div>
    </main>
  );
}
