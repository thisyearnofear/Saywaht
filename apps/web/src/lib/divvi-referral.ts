// This file is kept for potential future use of Divvi referral tracking
// Currently, Divvi tracking is handled directly in the deployment step
// using the @divvi/referral-sdk package

import { Address } from "viem";
import { PLATFORM_ADDRESS, PLATFORM_URL } from "./constants";

// Divvi configuration - Your Divvi Identifier
export const DIVVI_CONSUMER_ADDRESS = process.env.NEXT_PUBLIC_DIVVI_CONSUMER_ADDRESS as Address || PLATFORM_ADDRESS;

/**
 * Get referrer address from URL parameters
 * Useful for referral links like: https://saywaht.com?ref=0x123...
 */
export function getReferrerFromUrl(): Address | undefined {
  if (typeof window === "undefined") return undefined;
  
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  
  if (ref && ref.startsWith("0x") && ref.length === 42) {
    return ref as Address;
  }
  
  return undefined;
}

/**
 * Build a referral link for sharing
 */
export function buildReferralLink(referrerAddress: Address): string {
  return `${PLATFORM_URL}?ref=${referrerAddress}`;
}