/**
 * Backend health check — shared between the mint wizard (fail-fast on mount)
 * and the deploy step (final gate before broadcasting).
 *
 * Extracted from deploy-step.tsx so the wizard can call it at step 1 instead
 * of waiting until the user has invested in thumbnail/format/preview/export.
 */

const BACKEND_EXPORT_URL =
  process.env.NEXT_PUBLIC_BACKEND_EXPORT_URL || "https://persidian.com";

export async function assertBackendHealthy(): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_EXPORT_URL}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Connectivity is fine; backend health endpoint is rate-limited.
        return;
      }
      throw new Error(`Backend health check failed (${response.status})`);
    }
  } catch (error) {
    const reason =
      error instanceof Error ? error.message : "Unable to reach backend health endpoint";
    throw new Error(
      `Backend is currently unavailable. Please retry in a moment. (${reason})`
    );
  }
}
