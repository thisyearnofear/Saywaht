import { NextRequest, NextResponse } from "next/server";

/**
 * AI Thumbnail Generation API
 *
 * Uses Venice AI image generation to create thumbnails from the user's prompt.
 * Falls back to the supplied video frame when VENICE_API_KEY is not configured.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, videoFrame } = body;

    if (!videoFrame) {
      return NextResponse.json(
        { success: false, error: "No video frame provided" },
        { status: 400 }
      );
    }

    const VENICE_API_KEY = process.env.VENICE_API_KEY;

    // ── Venice AI generation ────────────────────────────────────────
    if (VENICE_API_KEY && prompt) {
      try {
        console.log("🎨 Generating thumbnail with Venice AI...");
        console.log("Prompt:", prompt);

        const veniceResponse = await fetch(
          "https://api.venice.ai/api/v1/image/generate",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${VENICE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "nano-banana-pro",
              prompt,
              width: 1024,
              height: 576, // ~16:9 for thumbnails
              format: "webp",
              safe_mode: true,
              hide_watermark: false,
              cfg_scale: 7.5,
            }),
          }
        );

        if (!veniceResponse.ok) {
          const errBody = await veniceResponse.text();
          console.error("Venice AI error:", veniceResponse.status, errBody);
          throw new Error(`Venice AI returned ${veniceResponse.status}`);
        }

        const veniceData = await veniceResponse.json();

        if (veniceData.images?.[0]) {
          const base64Image = veniceData.images[0];
          const dataUrl = `data:image/webp;base64,${base64Image}`;

          console.log("✅ Venice AI thumbnail generated successfully");
          return NextResponse.json({
            success: true,
            thumbnailUrl: dataUrl,
            method: "venice_ai",
            message: "AI thumbnail generated with Venice AI!",
          });
        }

        throw new Error("No image data in Venice AI response");
      } catch (veniceError) {
        console.error("Venice AI generation failed, falling back to video frame:", veniceError);
        // Fall through to video frame fallback
      }
    } else if (!VENICE_API_KEY) {
      console.log("📸 VENICE_API_KEY not set; using video frame fallback");
    }

    // ── Fallback: return the video frame as-is ──────────────────────
    return NextResponse.json({
      success: true,
      thumbnailUrl: videoFrame,
      method: "video_frame",
      message: "Using video frame as thumbnail. Set VENICE_API_KEY for AI generation.",
    });
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to generate thumbnail",
      },
      { status: 500 }
    );
  }
}

export async function GET(_req: NextRequest) {
  const hasKey = !!process.env.VENICE_API_KEY;
  return NextResponse.json({
    status: "ok",
    service: "ai-thumbnail-generation",
    methods: hasKey ? ["venice_ai", "video_frame"] : ["video_frame"],
    aiEnabled: hasKey,
  });
}
