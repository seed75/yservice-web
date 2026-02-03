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

  // ✅ Allow login/callback pages through the gate (without this, /login goes blank)
  const isPublicRoute = useMemo(() => {
    if (!pathname) return false;
    return pathname === "/login" || pathname.startsWith("/auth");
  }, [pathname]);

  useEffect(() => {
    let alive = true;

    async function run() {
      // /login itself should just be shown
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
        // If not an allowed email, sign out and redirect to login
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
    // Show 'checking' screen instead of blank
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        Checking authentication...
      </div>
    );
  }

  if (!allowed) {
    // Minimize UI during redirect
    return null;
  }

  return <>{children}</>;
}
