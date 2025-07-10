/**
 * Platform Constants
 * Centralized configuration for platform-wide constants
 */

import { Address } from "viem";

// SayWhat Platform Address
// This address is used for:
// - Zora Protocol Rewards: Earns 15% of all trading fees as create referral
// - Divvi Referral Tracking: Tracks user acquisition and engagement
export const PLATFORM_ADDRESS = "0x55A5705453Ee82c742274154136Fce8149597058" as Address;

// Platform Name
export const PLATFORM_NAME = "SayWhat";

// Platform URLs
export const PLATFORM_URLS = {
  production: "https://saywaht.com",
  development: "http://localhost:3000",
} as const;

// Get current platform URL based on environment
export const PLATFORM_URL = process.env.NEXT_PUBLIC_APP_URL || PLATFORM_URLS.production;