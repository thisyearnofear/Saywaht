"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { sdk } from "@farcaster/miniapp-sdk";

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
    const run = async () => {
      if (typeof window !== "undefined" && !isFarcasterMiniApp) {
        let inMiniApp = false;
        try {
          const detector = (sdk as any).isInMiniApp;
          inMiniApp = typeof detector === "function" ? await detector() : false;
        } catch {}
        const urlFlag =
          window.location.search.includes("farcaster") ||
          window.location.search.includes("fid");
        if (!inMiniApp && !urlFlag) {
          router.push("/editor");
        }
      }
    };
    run();
  }, [isFarcasterMiniApp, router]);

  return null;
}
