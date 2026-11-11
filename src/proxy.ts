import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { randomBytes, createHash } from "node:crypto";
import { authConfig, secureCookies, appOrigin } from "@/lib/enterprise/config";
import { THEME_BOOTSTRAP } from "@/lib/themeBootstrap";
export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const legacy =
    path.startsWith("/admin") ||
    path.startsWith("/case/") ||
    path.startsWith("/firm/") ||
    path.startsWith("/api/case/") ||
    path === "/api/intake" ||
    path.startsWith("/api/cron/");
  if (legacy && process.env.ENTERPRISE_MODE === "1")
    return new NextResponse(
      "Legacy pilot surfaces are disabled in this deployment",
      { status: 404 },
    );
  if (path.startsWith("/admin")) {
    const password = process.env.ADMIN_PASSWORD;
    if (!password)
      return new NextResponse("Administrator access unavailable", {
        status: 503,
      });
    try {
      const h = req.headers.get("authorization") ?? "",
        decoded = h.startsWith("Basic ") ? atob(h.slice(6)) : "";
      const sep = decoded.indexOf(":");
      if (
        sep >= 0 &&
        decoded.slice(0, sep) === "admin" &&
        decoded.slice(sep + 1) === password
      )
        return NextResponse.next();
    } catch {}
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="admin"' },
    });
  }
  if (!path.startsWith("/workspace") && !path.startsWith("/auth"))
    return NextResponse.next();
  const nonce = randomBytes(18).toString("base64");
  const themeHash = createHash("sha256")
    .update(THEME_BOOTSTRAP)
    .digest("base64");
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'sha256-${themeHash}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`;
  req.headers.set("x-nonce", nonce);
  req.headers.set("Content-Security-Policy", csp);
  let response = NextResponse.next({ request: { headers: req.headers } });
  const protect = (r: NextResponse) => {
    r.headers.set("Content-Security-Policy", csp);
    r.headers.set("Cache-Control", "private, no-store, max-age=0");
    r.headers.set("X-Robots-Tag", "noindex, nofollow");
    // Native POST forms need their real same-origin Origin header. no-referrer
    // makes browsers serialize it as "null", which our mutation guard rejects.
    r.headers.set("Referrer-Policy", "same-origin");
    return r;
  };
  let settings;
  try {
    settings = authConfig();
    secureCookies();
  } catch {
    return path.startsWith("/workspace")
      ? protect(
          new NextResponse("Company access is not configured", { status: 503 }),
        )
      : protect(response);
  }
  const client = createServerClient(settings.url, settings.key, {
    cookieOptions: {
      httpOnly: true,
      secure: secureCookies(),
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (values) => {
        values.forEach((v) => req.cookies.set(v.name, v.value));
        response = NextResponse.next({ request: { headers: req.headers } });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            secure: secureCookies(),
            sameSite: "lax",
          }),
        );
      },
    },
  });
  const { data, error } = await client.auth.getUser();
  if (path.startsWith("/workspace") && (error || !data.user)) {
    const redirected = NextResponse.redirect(new URL("/auth/sign-in", appOrigin()));
    response.cookies.getAll().forEach((c) => redirected.cookies.set(c));
    return protect(redirected);
  }
  return protect(response);
}
export const config = {
  matcher: [
    "/admin/:path*",
    "/workspace/:path*",
    "/auth/:path*",
    "/case/:path*",
    "/firm/:path*",
    "/api/case/:path*",
    "/api/intake",
    "/api/cron/:path*",
  ],
};
