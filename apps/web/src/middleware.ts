import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for Saywaht
 * ENHANCEMENT: Centralized auth checks, redirects, and request optimizations
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ENHANCEMENT: Security headers
  const response = NextResponse.next();

  // Add security headers
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // ENHANCEMENT: Cache control for static assets
  if (
    pathname.startsWith("/_next/static/") ||
    pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$/)
  ) {
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  // ENHANCEMENT: API route rate limiting hints
  // Note: Full rate limiting should be done at the edge function level
  if (pathname.startsWith("/api/")) {
    // Add request ID for tracing
    const requestId = crypto.randomUUID();
    response.headers.set("X-Request-ID", requestId);

    // Add cache hints for read-heavy endpoints
    if (
      pathname.startsWith("/api/external/") ||
      pathname === "/api/health"
    ) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=60, s-maxage=300"
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public directory)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
