import { NextRequest } from "next/server";
import { 
  withRateLimit, 
  createErrorResponse, 
  createSuccessResponse 
} from "@/lib/api/middleware";
import { filecoinApiService } from "@/lib/api/filecoin-service";

const rateLimitMiddleware = withRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // Lower limit for file uploads
});

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return createErrorResponse("No file provided", 400);
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Filecoin
    const result = await filecoinApiService.uploadFile(buffer, file.name);
    
    return createSuccessResponse(result);

  } catch (error) {
    console.error("❌ Filecoin upload failed:", error);
    return createErrorResponse(
      "Upload failed",
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}
