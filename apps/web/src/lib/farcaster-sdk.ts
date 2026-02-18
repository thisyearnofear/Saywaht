"use client";

import { useEffect, useState } from "react";
import type { sdk as SdkType } from "@farcaster/miniapp-sdk";

// Type for the SDK
type SDKType = typeof SdkType;

// Singleton to cache the SDK instance
let cachedSdk: SDKType | null = null;
let sdkPromise: Promise<SDKType | null> | null = null;

/**
 * Dynamically import the Farcaster SDK only on client side
 * This prevents SSR issues and WebView crashes
 */
export async function getFarcasterSdk(): Promise<SDKType | null> {
  // Return cached SDK if available
  if (cachedSdk) return cachedSdk;
  
  // Return existing promise if already loading
  if (sdkPromise) return sdkPromise;
  
  // Only import on client side
  if (typeof window === "undefined") return null;
  
  sdkPromise = import("@farcaster/miniapp-sdk").then((mod) => {
    cachedSdk = mod.sdk;
    return cachedSdk;
  }).catch((err) => {
    console.error("Failed to load Farcaster SDK:", err);
    return null;
  });
  
  return sdkPromise;
}

/**
 * Hook to safely use the Farcaster SDK
 * Returns null during SSR, then loads SDK on client
 */
export function useFarcasterSdk() {
  const [sdk, setSdk] = useState<SDKType | null>(cachedSdk);
  
  useEffect(() => {
    let mounted = true;
    
    getFarcasterSdk().then((sdkInstance) => {
      if (mounted && sdkInstance) {
        setSdk(sdkInstance);
      }
    });
    
    return () => {
      mounted = false;
    };
  }, []);
  
  return sdk;
}

// Re-export types
export type { SDKType };
