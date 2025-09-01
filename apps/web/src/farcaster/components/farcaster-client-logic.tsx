"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";

/**
 * Farcaster Client Logic
 * Handles client-side initialization and routing for Farcaster integration
 */

export function FarcasterClientLogic() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setFrameState, isFarcasterMiniApp } = useFarcasterContext();

  // Initialize frame state from URL parameters
  useEffect(() => {
    // Extract frame data from URL parameters
    const castHash = searchParams.get("cast") || undefined;
    const fid = searchParams.get("fid") || undefined;
    const initialStep = (searchParams.get("step") as any) || "welcome";

    // Set initial frame state
    setFrameState({
      castHash,
      step: initialStep,
    });
  }, [searchParams, setFrameState]);

  // Redirect to main editor if not in Farcaster context
  useEffect(() => {
    if (typeof window !== "undefined" && !isFarcasterMiniApp) {
      // Simple check for Farcaster context
      const isFarcaster =
        window.location.search.includes("farcaster") ||
        window.location.search.includes("fid");

      if (!isFarcaster) {
        router.push("/editor");
      }
    }
  }, [isFarcasterMiniApp, router]);

  return null;
}
