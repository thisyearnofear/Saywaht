import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextRequest, NextResponse } from "next/server";
import {
  withRateLimit,
  createErrorResponse,
  parseJsonBody,
  validateRequired
} from "@/lib/api/middleware";

const rateLimitMiddleware = withRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3,
});

async function streamToBuffer(stream: ReadableStream): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks);
}

export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitResult = rateLimitMiddleware(request);
  if (rateLimitResult) return rateLimitResult;

  try {
    // Parse and validate input
    const body = await parseJsonBody<{ text: string }>(request);
    validateRequired(body, ['text']);

    if (body.text.length > 1000) {
      return createErrorResponse("Text is too long. Maximum 1000 characters.", 400);
    }

    if (!process.env.ELEVENLABS_API_KEY) {
      console.error("ELEVENLABS_API_KEY is not configured");
      return createErrorResponse("Audio generation service is not configured", 503);
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });

    const audioStream = await elevenlabs.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
      text: body.text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });

    const buffer = await streamToBuffer(audioStream);

    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("ElevenLabs API error:", error);
    return createErrorResponse(
      "Failed to generate audio",
      500,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}