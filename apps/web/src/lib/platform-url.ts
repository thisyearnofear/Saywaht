/**
 * Canonical public origin for all shareable URLs (coin pages, project links,
 * OG images, agent tool output).
 *
 * Deliberately a standalone module with zero imports: the app's `@/lib` barrel
 * pulls client-only React modules into server route bundles, so the agent
 * layer and other server contexts must be able to import platform constants
 * from here. Keep this file dependency-free.
 *
 * Single rule for the whole product: every coin has exactly ONE canonical,
 * public, server-rendered URL — `${PLATFORM_URL}/coin/${address}` — and
 * humans, shares, and agents all converge there. It must therefore be one
 * shared constant, never a re-declared literal.
 */
export const PLATFORM_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.netlify.app";

export const COIN_PAGE_URL = (address: string) => `${PLATFORM_URL}/coin/${address}`;
