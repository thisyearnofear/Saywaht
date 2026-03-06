import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function proxy(_request: NextRequest) {
  // With wallet-based auth, we don't need server-side session checks.
  // Authentication is handled client-side via wallet connection.
  return NextResponse.next();
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
