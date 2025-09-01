import { metadata } from "@/app/layout";
import { generateOptimizedFrameMetadata } from "@/farcaster/utils/performance-utils";

/**
 * Frame metadata generator for Farcaster mini app
 * Single source of truth for all frame-related metadata
 * Optimized for performance and reliability
 */
export interface FrameMetadata {
  "fc:frame": string;
  "fc:frame:image": string;
  "fc:frame:post_url"?: string;
  "fc:frame:input:text"?: string;
  "fc:frame:button:1"?: string;
  "fc:frame:button:1:action"?: string;
  "fc:frame:button:2"?: string;
  "fc:frame:button:2:action"?: string;
  [key: string]: string | undefined;
}

/**
 * Generate frame metadata based on current app state
 * Uses existing PWA metadata as base and extends for Farcaster
 * Optimized version for better performance
 */
export function generateFrameMetadata(
  overrideMetadata?: Partial<FrameMetadata>
): FrameMetadata {
  // Use optimized metadata generation
  const baseMetadata = generateOptimizedFrameMetadata(
    overrideMetadata?.["fc:frame:image"]?.includes("recording") ? "recording" :
    overrideMetadata?.["fc:frame:image"]?.includes("minting") ? "minting" :
    overrideMetadata?.["fc:frame:image"]?.includes("complete") ? "complete" : "welcome"
  );

  return {
    ...baseMetadata,
    ...overrideMetadata,
  };
}

/**
 * Generate frame action URLs
 */
export function generateFrameActionUrl(action: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
  }
  return `${baseUrl}/api/farcaster/${action}`;
}

/**
 * Get frame image URL for different states
 */
export function getFrameImageUrl(state: "welcome" | "recording" | "minting" | "complete"): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL environment variable is required');
  }
  return `${baseUrl}/api/farcaster/image?state=${state}`;
}