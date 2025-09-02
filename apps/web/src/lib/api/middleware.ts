import { NextRequest, NextResponse } from "next/server";

// Types for better organization
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
}

// Centralized rate limiting
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function createRateLimit(config: RateLimitConfig) {
  return function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const { windowMs, maxRequests } = config;

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
  };
}

// Centralized error responses
export function createErrorResponse(
  error: string,
  status: number = 500,
  details?: string
): NextResponse {
  return NextResponse.json(
    { success: false, error, details } as ApiResponse,
    { status }
  );
}

// Centralized success responses
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    { success: true, data } as ApiResponse<T>,
    { status }
  );
}

// Rate limiting middleware
export function withRateLimit(config: RateLimitConfig) {
  const checkRateLimit = createRateLimit(config);
  
  return function rateLimitMiddleware(request: NextRequest): NextResponse | null {
    const ip = request.headers.get("x-forwarded-for") ?? "127.0.0.1";
    
    if (!checkRateLimit(ip)) {
      return createErrorResponse(
        "Too many requests. Please try again later.",
        429
      );
    }
    
    return null; // Continue to next middleware/handler
  };
}

// JSON body parsing middleware
export async function parseJsonBody<T = any>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch (error) {
    throw new Error("Invalid JSON in request body");
  }
}

// Input validation middleware
export function validateRequired<T extends Record<string, any>>(
  data: T,
  requiredFields: (keyof T)[]
): void {
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== "string") {
      throw new Error(`${String(field)} is required`);
    }
  }
}

// API key management
export class ApiKeyManager {
  private static zoraKeySet = false;

  static setZoraKey(): void {
    // Only set the key if we're in a server environment and have the API key
    if (typeof window === 'undefined' && !this.zoraKeySet && process.env.ZORA_API_KEY) {
      try {
        // Use require instead of dynamic import to avoid bundling issues
        const { setApiKey } = require("@zoralabs/coins-sdk");
        setApiKey(process.env.ZORA_API_KEY!);
        console.log("🔑 Zora API key configured");
        this.zoraKeySet = true;
      } catch (error) {
        console.warn("⚠️ Failed to set Zora API key:", error);
      }
    } else if (!process.env.ZORA_API_KEY) {
      console.warn("⚠️ ZORA_API_KEY not set - you may hit rate limits");
    }
  }

  static getFilecoinConfig() {
    const privateKey = process.env.FILECOIN_PRIVATE_KEY;
    const walletAddress = process.env.FILECOIN_WALLET_ADDRESS;
    
    if (!privateKey || !walletAddress) {
      throw new Error("Filecoin configuration missing. Set FILECOIN_PRIVATE_KEY and FILECOIN_WALLET_ADDRESS");
    }
    
    return { privateKey, walletAddress };
  }
}

// Compose multiple middlewares
export function composeMiddleware(
  ...middlewares: Array<(request: NextRequest) => NextResponse | Promise<NextResponse> | null>
) {
  return async function composedMiddleware(request: NextRequest): Promise<NextResponse | null> {
    for (const middleware of middlewares) {
      const result = await middleware(request);
      if (result) return result; // Stop on first non-null response
    }
    return null;
  };
}
