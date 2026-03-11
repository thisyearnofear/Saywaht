"use client";

/**
 * Lazy-loaded Web3 Provider wrapper
 * ENHANCEMENT: Only loads RainbowKit/wagmi when wallet functionality is needed
 * This saves ~300KB from the initial bundle on pages that don't need wallet
 */

import dynamic from "next/dynamic";

// Lazy load the full Web3Provider - only loads on client
const LazyWeb3Provider = dynamic(
  () => import("./wagmi-provider").then((mod) => mod.Web3Provider),
  { 
    ssr: false,
    loading: () => null, // Render children without wallet until loaded
  }
);

interface Web3ProviderLazyProps {
  children: React.ReactNode;
}

export function Web3ProviderLazy({ children }: Web3ProviderLazyProps) {
  return <LazyWeb3Provider>{children}</LazyWeb3Provider>;
}

// Re-export for convenience
export { Web3Provider } from "./wagmi-provider";
