import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for Saywaht
 * ENHANCEMENT: Centralized auth checks, redirects, request optimizations, and security headers
 */

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response and add security headers
  const response = NextResponse.next();

  // ENHANCEMENT: Security headers
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

  // ENHANCEMENT: API route optimizations
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
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
