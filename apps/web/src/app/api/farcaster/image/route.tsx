import { NextRequest } from "next/server";
import { ImageResponse } from "next/og";
import { generateOptimizedFrameImage } from "@/farcaster/utils/performance-utils";

/**
 * Farcaster Frame Image API
 * Generates dynamic images for Farcaster frames
 * Uses existing brand assets and styling
 * Optimized for performance with caching
 */

export const runtime = "edge";

// Add caching headers for better performance
export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

export async function GET(
  request: NextRequest,
  { params }: { params: { state: string } }
) {
  console.log("Farcaster image route called with URL:", request.url);
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state") || params?.state || "welcome";
    const title = searchParams.get("title") || undefined;
    const subtitle = searchParams.get("subtitle") || undefined;
    console.log(
      "Farcaster image params - state:",
      state,
      "title:",
      title,
      "subtitle:",
      subtitle
    );

    // Generate optimized frame image config
    const imageConfig = await generateOptimizedFrameImage(
      state,
      title,
      subtitle
    );
    console.log("Generated image config:", imageConfig);

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: imageConfig.backgroundColor,
            padding: "40px",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
              borderRadius: "20px",
              padding: "40px",
              border: `4px solid ${imageConfig.accentColor}`,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* Icon based on state */}
            <div
              style={{
                fontSize: "80px",
                marginBottom: "30px",
              }}
            >
              {imageConfig.icon}
            </div>

            <h1
              style={{
                fontSize: "50px",
                fontWeight: "bold",
                color: "#FFFFFF",
                textAlign: "center",
                marginBottom: "20px",
                textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
              }}
            >
              {imageConfig.title}
            </h1>

            <p
              style={{
                fontSize: "30px",
                color: imageConfig.accentColor,
                textAlign: "center",
                maxWidth: "80%",
                lineHeight: "1.4",
              }}
            >
              {imageConfig.subtitle}
            </p>

            {/* State indicator */}
            <div
              style={{
                marginTop: "30px",
                fontSize: "24px",
                color: imageConfig.accentColor,
                fontWeight: "bold",
                textTransform: "uppercase",
                letterSpacing: "2px",
              }}
            >
              {state === "recording"
                ? "Recording Mode"
                : state === "minting"
                ? "Creating Coin"
                : state === "complete"
                ? "Complete!"
                : "Get Started"}
            </div>
          </div>

          {/* Branding */}
          <div
            style={{
              position: "absolute",
              bottom: "20px",
              right: "20px",
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: "20px",
            }}
          >
            saywaht.app
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
