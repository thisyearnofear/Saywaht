import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/storacha/captions
 * Store caption transcripts permanently on Storacha
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { transcript, segments, language = 'en' } = body;

    if (!transcript || !segments) {
      return NextResponse.json(
        { error: "Missing required fields: transcript and segments" },
        { status: 400 }
      );
    }

    // Dynamically import to avoid SSR issues
    const { StorachaStorageService } = await import("@/lib/storacha-storage");
    
    const service = new StorachaStorageService({
      privateKey: process.env.STORACHA_PRIVATE_KEY,
      delegation: process.env.STORACHA_DELEGATION
    });

    const result = await service.storeCaptions(transcript, segments, language);

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("Storacha caption upload error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Upload failed",
        success: false 
      },
      { status: 500 }
    );
  }
}
