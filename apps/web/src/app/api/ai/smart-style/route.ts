import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * AI Smart Style API
 * 
 * Uses AI to analyze voiceover text and suggest a visual style for captions.
 */

const STYLE_PROMPT = `
Analyze the following text from a video voiceover and suggest a visual style for captions that matches the tone and content.
You MUST return ONLY a valid JSON object with the following properties:
- color: a high-contrast hex color code (e.g., #FFFFFF, #FFFF00, #00FFFF)
- fontSize: a number between 24 and 42
- fontWeight: "normal" or "bold"
- fontFamily: one of ["Inter", "Arial", "Helvetica", "Georgia", "Times New Roman", "Courier New", "Comic Sans MS"]
- textAlign: "left", "center", or "right"

Text to analyze:
`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const VENICE_API_KEY = process.env.VENICE_API_KEY;
    
    // Fallback default style if AI fails or key is missing
    const defaultStyle = {
      color: "#FFFFFF",
      fontSize: 32,
      fontWeight: "bold",
      fontFamily: "Inter",
      textAlign: "center"
    };

    if (!VENICE_API_KEY) {
      console.warn("VENICE_API_KEY not set, using default style");
      return NextResponse.json({ style: defaultStyle });
    }

    const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VENICE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b", // Use a fast chat model
        messages: [
          { role: "system", content: "You are a specialized video editor assistant that returns only JSON styles." },
          { role: "user", content: STYLE_PROMPT + text }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      throw new Error(`Venice API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    const style = JSON.parse(content);
    
    // Ensure all required fields are present, fallback to defaults if missing
    const validatedStyle = {
      color: style.color || defaultStyle.color,
      fontSize: style.fontSize || defaultStyle.fontSize,
      fontWeight: style.fontWeight || defaultStyle.fontWeight,
      fontFamily: style.fontFamily || defaultStyle.fontFamily,
      textAlign: style.textAlign || defaultStyle.textAlign
    };

    return NextResponse.json({ style: validatedStyle });

  } catch (error) {
    console.error("Smart style error:", error);
    return NextResponse.json({ 
      style: {
        color: "#FFFFFF",
        fontSize: 32,
        fontWeight: "bold",
        fontFamily: "Inter",
        textAlign: "center"
      } 
    });
  }
}
