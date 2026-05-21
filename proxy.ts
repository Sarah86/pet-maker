import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/"];

function allowedEmails(): Set<string> | null {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.length > 0 ? new Set(list) : null;
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh expired sessions — do not remove this call
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!isProtected) {
    // Redirect authenticated + allowed users away from /login
    if (user && pathname === "/login") {
      const allowed = allowedEmails();
      const isAllowed =
        allowed === null || allowed.has(user.email?.toLowerCase() ?? "");
      if (isAllowed) {
        const url = request.nextUrl.clone();
        url.pathname = "/orders";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }
    return supabaseResponse;
  }

  // Protected route — require auth
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const allowed = allowedEmails();
  const isAllowed =
    allowed === null || allowed.has(user.email?.toLowerCase() ?? "");

  if (!isAllowed) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "?error=unauthorized";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const proxyConfig = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
