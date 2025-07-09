import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { NextResponse } from "next/server";

// Simple in-memory rate limiting for development
// In production, you'd want to use Redis or a proper rate limiting service
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 3;

  const current = requestCounts.get(ip);

  if (!current || now > current.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (current.count >= maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

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

export async function POST(request: Request) {
  // Rate limiting check
  const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
  const rateLimitOk = checkRateLimit(ip);

  if (!rateLimitOk) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let text: string;
  
  try {
    const body = await request.json();
    text = body.text;
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  if (text.length > 1000) {
    return NextResponse.json(
      { error: "Text is too long. Maximum 1000 characters." },
      { status: 400 }
    );
  }

  if (!process.env.ELEVENLABS_API_KEY) {
    console.error("ELEVENLABS_API_KEY is not configured");
    return NextResponse.json(
      { error: "Audio generation service is not configured" },
      { status: 503 }
    );
  }

  const elevenlabs = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  try {
    const audioStream = await elevenlabs.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
      text,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });

    const buffer = await streamToBuffer(audioStream);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    console.error("ElevenLabs API error:", error);
    return NextResponse.json(
      { error: "Failed to generate audio" },
      { status: 500 }
    );
  }
}