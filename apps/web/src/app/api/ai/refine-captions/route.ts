import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const maxDuration = 60;

/**
 * AI Refine Captions API
 * 
 * Uses Agent Compute / Venice to improve the readability and impact of generated captions.
 */

const REFINE_PROMPT = `
You are an expert short-form video editor. 
Below are generated captions for a video.
Your goal is to:
1. Fix any transcription errors.
2. Make the text punchier and more engaging.
3. Keep the segments short.
4. Maintain the exact same number of segments.

Output ONLY the refined segments as a JSON array of strings.

Captions:
`;

export async function POST(req: NextRequest) {
  try {
    const { segments } = await req.json();

    if (!segments || !Array.isArray(segments)) {
      return NextResponse.json({ error: "Invalid segments" }, { status: 400 });
    }

    const VENICE_API_KEY = process.env.VENICE_API_KEY;

    // In a real ACP integration, we would check 'acp compute status' 
    // and use the agent's identity to sign the request.
    // For now, we simulate the 'Agent-Powered' inference.
    
    const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-70b", // Use a more capable model for refinement
        messages: [
          { role: "system", content: "You refine video captions into engaging content." },
          { role: "user", content: REFINE_PROMPT + JSON.stringify(segments) }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const result = JSON.parse(content);

    return NextResponse.json({ refined: result.segments || result });

  } catch (error: any) {
    console.error("Refine captions error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
