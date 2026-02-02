"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const ALLOWED_EMAIL = "blessedrootsau@gmail.com";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  // ✅ 로그인/콜백 페이지는 게이트 통과 (여기 없으면 /login이 흰 화면 됨)
  const isPublicRoute = useMemo(() => {
    if (!pathname) return false;
    return pathname === "/login" || pathname.startsWith("/auth");
  }, [pathname]);

  useEffect(() => {
    let alive = true;

    async function run() {
      // /login 자체는 그냥 보여줘야 함
      if (isPublicRoute) {
        if (!alive) return;
        setAllowed(true);
        setChecking(false);
        return;
      }

      setChecking(true);
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!alive) return;

      if (!user) {
        setAllowed(false);
        setChecking(false);
        router.replace("/login");
        return;
      }

      const email = (user.email ?? "").toLowerCase();
      if (email !== ALLOWED_EMAIL.toLowerCase()) {
        // 허용 이메일이 아니면 로그아웃시키고 로그인으로 보냄
        await supabase.auth.signOut();
        setAllowed(false);
        setChecking(false);
        router.replace("/login");
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    run();
    return () => {
      alive = false;
    };
  }, [isPublicRoute, router]);

  if (checking) {
    // 흰 화면 대신 "체크중" 화면
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        인증 확인 중...
      </div>
    );
  }

  if (!allowed) {
    // redirect 중이라 UI는 최소화
    return null;
  }

  return <>{children}</>;
}
