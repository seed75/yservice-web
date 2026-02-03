// web/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ALLOWED_EMAIL = "blessedrootsau@gmail.com"; // ✅ Single allowed email (fixed)

export async function proxy(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  const pathname = req.nextUrl.pathname;
  const isLoginPage = pathname.startsWith("/login");

  // ✅ 1) If not logged in and not on the login page -> redirect to /login
  if (!user && !isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ✅ 2) If logged in but not an allowed email -> redirect to /login (blocked)
  if (user && user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("reason", "not_allowed");
    return NextResponse.redirect(url);
  }

  // ✅ 3) If logged in and on the login page -> redirect to home
  if (user && isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
