// web/proxy.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ALLOWED_EMAIL = "blessedrootsau@gmail.com"; // ✅ 허용할 이메일 1개 고정

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

  // ✅ 1) 로그인 안했는데 login 페이지가 아니면 -> login으로
  if (!user && !isLoginPage) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // ✅ 2) 로그인 했는데 허용 이메일 아니면 -> login으로 (차단)
  if (user && user.email?.toLowerCase() !== ALLOWED_EMAIL.toLowerCase()) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("reason", "not_allowed");
    return NextResponse.redirect(url);
  }

  // ✅ 3) 로그인했는데 login 페이지면 -> 홈으로
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
