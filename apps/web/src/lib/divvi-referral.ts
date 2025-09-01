/**
 * Divvi Referral Integration (v2)
 * 
 * Simplified integration using the @divvi/referral-sdk v2
 * Handles referral tracking for earning rewards on user transactions
 */

import { Address } from "viem";
import { PLATFORM_URL } from "./index";

// Divvi consumer address (your Divvi Identifier)
export const DIVVI_CONSUMER_ADDRESS = '0x55A5705453Ee82c742274154136Fce8149597058';

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