import { NextRequest } from "next/server";
import {
  withRateLimit,
  createErrorResponse,
  createSuccessResponse,
  parseJsonBody,
  validateRequired
} from "@/lib/api/middleware";
import { zoraApiService } from "@/lib/api/zora-service";

const rateLimitMiddleware = withRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // Lower limit for validation requests
});

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Parse and validate input
    const body = await parseJsonBody<{ metadataUri: string }>(request);
    validateRequired(body, ['metadataUri']);

    // Validate metadata
    await zoraApiService.validateMetadata(body.metadataUri);

    return createSuccessResponse({ message: "Metadata validation passed" });

  } catch (error) {
    console.error("❌ Metadata validation failed:", error);
    const isValidationError = error instanceof Error &&
      (error.message.includes("validation") || error.message.includes("required"));

    return createErrorResponse(
      error instanceof Error ? error.message : "Metadata validation failed",
      isValidationError ? 400 : 500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
