"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onLogout}
      disabled={loading}
      className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-sm font-medium transition disabled:opacity-50"
      style={{
        borderColor: "var(--card-border)",
        background: "rgba(255,255,255,0.85)",
        color: "var(--text)",
      }}
    >
      {loading ? "로그아웃..." : "로그아웃"}
    </button>
  );
}
