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

  // Redirect to main editor if not in Farcaster context - with timeout
  useEffect(() => {
    const checkAndRedirect = async () => {
      if (typeof window === "undefined") return;

      // Wait a bit for Farcaster context to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (!isFarcasterMiniApp) {
        let inMiniApp = false;
        try {
          const detector = (sdk as any).isInMiniApp;
          if (typeof detector === "function") {
            inMiniApp = await Promise.race([
              detector(),
              new Promise(resolve => setTimeout(() => resolve(false), 1000))
            ]) as boolean;
          }
        } catch (error) {
          console.log("Mini app detection failed:", error);
        }

        const urlFlag =
          window.location.search.includes("farcaster") ||
          window.location.search.includes("fid") ||
          window.location.pathname.includes("farcaster");

        // Only redirect if we're definitely not in a Farcaster context
        if (!inMiniApp && !urlFlag && !window.location.pathname.includes("farcaster")) {
          console.log("Not in Farcaster context, redirecting to main editor");
          router.push("/editor");
        }
      }
    };

    checkAndRedirect();
  }, [isFarcasterMiniApp, router]);

  return null;
}
