import { NextRequest } from "next/server";
import { withRateLimit, createErrorResponse, createSuccessResponse } from "@/lib/api/middleware";
import { zoraApiService } from "@/lib/api/zora-service";

const rateLimitMiddleware = withRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // Allow more requests for coin data
});

export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    const coins = await zoraApiService.getTrendingCoins();
    return createSuccessResponse(coins);
  } catch (error) {
    console.error("❌ Failed to fetch trending coins:", error);
    return createErrorResponse(
      "Failed to fetch trending coins",
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
