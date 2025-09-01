import { NextRequest } from "next/server";
import { generateFrameMetadata } from "@/farcaster/utils/frame-utils";

/**
 * Farcaster Frame Action Handler
 * Processes frame button actions and returns next frame
 */

export async function POST(request: NextRequest) {
  console.log("Farcaster action route called with URL:", request.url);
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    console.log("Farcaster action received:", action);

    // Generate next frame based on action
    const frameMetadata = generateFrameMetadata({
      "fc:frame:button:1": action === "start" ? "Record Commentary" : "Next Step",
      "fc:frame:button:2": "Create Coin",
      "fc:frame:image": `https://saywaht.netlify.app/api/farcaster/image?state=${action || "welcome"}`
    });
    console.log("Generated frame metadata:", frameMetadata);

    // Return frame metadata as JSON
    return new Response(JSON.stringify(frameMetadata), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Frame action error:", error);
    return new Response("Error processing frame action", { status: 500 });
  }
}