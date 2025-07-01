import { createAuthClient } from "better-auth/react";

// Get the base URL with fallback for development
const baseURL = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 
  (typeof window !== "undefined" ? `${window.location.origin}` : "http://localhost:3000");

// Validate in development/client-side only
if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_BETTER_AUTH_URL) {
  console.warn("NEXT_PUBLIC_BETTER_AUTH_URL not set, using current origin");
}

export const { signIn, signUp, useSession } = createAuthClient({
  baseURL,
}); 