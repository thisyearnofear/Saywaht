import { NextResponse } from "next/server";

// Simple in-memory rate limiting for development
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 5; // Allow more requests for thumbnails
  
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
  
  let prompt: string;
  let videoFrame: string | undefined;
  
  try {
    const body = await request.json();
    prompt = body.prompt;
    videoFrame = body.videoFrame; // Optional base64 video frame for context
  } catch (error) {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }
  
  if (!prompt || typeof prompt !== "string") {
    return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
  }
  
  if (prompt.length > 500) {
    return NextResponse.json(
      { error: "Prompt is too long. Maximum 500 characters." },
      { status: 400 }
    );
  }
  
  try {
    // Use Venice AI if available
    if (process.env.VENICE_API_KEY) {
      console.log("Using Venice AI for thumbnail generation");
      
      const response = await fetch('https://api.venice.ai/api/v1/images/generations', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.VENICE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'default',
          prompt: `${prompt}. Style: modern, vibrant, professional video thumbnail, eye-catching, high quality`,
          size: '1024x1024',
          response_format: 'b64_json',
          n: 1
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const thumbnailUrl = `data:image/png;base64,${data.data[0].b64_json}`;
        
        return NextResponse.json({
          success: true,
          thumbnailUrl,
          method: "venice_ai"
        });
      } else {
        console.error("Venice AI API error:", await response.text());
        throw new Error("Venice AI request failed");
      }
    }
    
    // Fallback to video frame if Venice AI fails or isn't available
    if (videoFrame) {
      return NextResponse.json({
        success: true,
        thumbnailUrl: videoFrame,
        method: "video_frame"
      });
    }
    
    // Final fallback: generate a styled placeholder
    const placeholderSvg = `
      <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <text x="50%" y="45%" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="48" font-weight="bold">
          ${prompt.slice(0, 30)}${prompt.length > 30 ? '...' : ''}
        </text>
        <text x="50%" y="60%" text-anchor="middle" fill="rgba(255,255,255,0.8)" font-family="Arial, sans-serif" font-size="24">
          Video Thumbnail
        </text>
      </svg>
    `;
    
    const base64Svg = Buffer.from(placeholderSvg).toString('base64');
    const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;
    
    return NextResponse.json({
      success: true,
      thumbnailUrl: dataUrl,
      method: "placeholder"
    });
    
  } catch (error) {
    console.error("AI thumbnail generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate thumbnail" },
      { status: 500 }
    );
  }
}