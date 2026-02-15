import { NextRequest, NextResponse } from "next/server";
import { FilecoinExportStorage } from "@/lib/filecoin-export-storage";

/**
 * POST /api/storage/export
 * Store exported videos to decentralized storage
 * Automatically routes to Filecoin (>8MB) or Grove (≤8MB)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const metadataStr = formData.get("metadata") as string;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    let metadata: any = {};
    if (metadataStr) {
      try {
        metadata = JSON.parse(metadataStr);
      } catch (e) {
        console.warn("Failed to parse metadata:", e);
      }
    }

    // Check storage capability
    const storageCheck = FilecoinExportStorage.canStore(file.size);
    if (!storageCheck.canStore) {
      return NextResponse.json(
        { 
          error: storageCheck.reason,
          success: false 
        },
        { status: 400 }
      );
    }

    // Initialize storage service
    const storage = new FilecoinExportStorage({
      privateKey: process.env.FILECOIN_PRIVATE_KEY,
      walletAddress: process.env.FILECOIN_WALLET_ADDRESS
    });

    console.log(`📤 Storing exported video: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);

    // Store the video
    const result = await storage.storeVideo(file, file.name);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        metadata: metadata
      }
    });

  } catch (error) {
    console.error("Export storage error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Storage failed",
        success: false 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/storage/export/recommendation?size=BYTES
 * Get storage recommendation for a file size
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sizeStr = searchParams.get("size");

    if (!sizeStr) {
      return NextResponse.json(
        { error: "Missing size parameter" },
        { status: 400 }
      );
    }

    const size = parseInt(sizeStr, 10);
    if (isNaN(size) || size < 0) {
      return NextResponse.json(
        { error: "Invalid size parameter" },
        { status: 400 }
      );
    }

    const recommendation = FilecoinExportStorage.getStorageRecommendation(size);
    const canStore = FilecoinExportStorage.canStore(size);

    return NextResponse.json({
      success: true,
      data: {
        canStore: canStore.canStore,
        ...recommendation
      }
    });

  } catch (error) {
    console.error("Storage recommendation error:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Request failed",
        success: false 
      },
      { status: 500 }
    );
  }
}
