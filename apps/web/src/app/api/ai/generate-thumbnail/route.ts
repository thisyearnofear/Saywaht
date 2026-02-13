import { NextRequest, NextResponse } from "next/server";

// Allow up to 60s for image generation (Vercel Pro default is 15s)
export const maxDuration = 60;

/**
 * AI Thumbnail Generation API
 *
 * Tries Venice AI models in order of speed, with fallback to video frame.
 */

interface VeniceModelConfig {
  model: string;
  label: string;
  width: number;
  height: number;
  timeoutMs: number;
}

// Models ordered by speed — fast turbo first, quality fallback second
const VENICE_MODELS: VeniceModelConfig[] = [
  {
    model: "z-image-turbo",
    label: "Venice Turbo",
    width: 1024,
    height: 576,
    timeoutMs: 20_000,
  },
  {
    model: "nano-banana-pro",
    label: "Nano Banana Pro",
    width: 1024,
    height: 576,
    timeoutMs: 40_000,
  },
];

async function tryVeniceModel(
  apiKey: string,
  prompt: string,
  config: VeniceModelConfig,
  dimensions?: { width: number; height: number }
): Promise<{ dataUrl: string; model: string; label: string } | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const width = dimensions?.width || config.width;
    const height = dimensions?.height || config.height;
    
    console.log(`🎨 Trying ${config.label} (${config.model}) at ${width}x${height}...`);

    const response = await fetch(
      "https://api.venice.ai/api/v1/image/generate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          prompt,
          width,
          height,
          format: "webp",
          safe_mode: true,
          hide_watermark: false,
          cfg_scale: 7.5,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    if (!response.ok) {
      const errBody = await response.text();
      console.error(
        `❌ ${config.label} error ${response.status}:`,
        errBody.slice(0, 200)
      );
      return null;
    }

    const data = await response.json();

    if (data.images?.[0]) {
      console.log(`✅ ${config.label} generated successfully`);
      return {
        dataUrl: `data:image/webp;base64,${data.images[0]}`,
        model: config.model,
        label: config.label,
      };
    }

    console.error(`❌ ${config.label}: no image data in response`);
    return null;
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      console.error(`⏱️ ${config.label} timed out after ${config.timeoutMs}ms`);
    } else {
      console.error(`❌ ${config.label} failed:`, error);
    }
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, videoFrame, aspectRatio } = body;

    if (!videoFrame) {
      return NextResponse.json(
        { success: false, error: "No video frame provided" },
        { status: 400 }
      );
    }

    const VENICE_API_KEY = process.env.VENICE_API_KEY;

    // Determine dimensions based on aspect ratio
    let dimensions = undefined;
    if (aspectRatio === "portrait") {
      dimensions = { width: 720, height: 1280 };
    } else if (aspectRatio === "square") {
      dimensions = { width: 1024, height: 1024 };
    } else if (aspectRatio === "landscape") {
      dimensions = { width: 1280, height: 720 };
    }

    // ── Venice AI generation with model fallback ────────────────────
    if (VENICE_API_KEY && prompt) {
      console.log("🎨 Generating thumbnail with Venice AI...");
      console.log(`Prompt: ${prompt}, Aspect Ratio: ${aspectRatio || "default"}`);

      for (const modelConfig of VENICE_MODELS) {
        const result = await tryVeniceModel(VENICE_API_KEY, prompt, modelConfig, dimensions);
        if (result) {
          return NextResponse.json({
            success: true,
            thumbnailUrl: result.dataUrl,
            method: "venice_ai",
            model: result.model,
            message: `AI thumbnail generated with ${result.label}!`,
          });
        }
      }

      console.warn("⚠️ All Venice AI models failed, falling back to video frame");
    } else if (!VENICE_API_KEY) {
      console.log("📸 VENICE_API_KEY not set; using video frame fallback");
    }

    // ── Fallback: return the video frame as-is ──────────────────────
    return NextResponse.json({
      success: true,
      thumbnailUrl: videoFrame,
      method: "video_frame",
      message:
        "Using video frame as thumbnail. Set VENICE_API_KEY for AI generation.",
    });
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate thumbnail",
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
    models: VENICE_MODELS.map((m) => m.model),
    aiEnabled: hasKey,
  });
}
