"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { FarcasterUser, FarcasterFrameState } from "@/farcaster/types";
import { useMobileContext } from "@/contexts/mobile-context";
import { sdk } from "@farcaster/miniapp-sdk";

type FarcasterContextType = {
  farcasterUser: FarcasterUser | null;
  frameState: FarcasterFrameState;
  isFarcasterMiniApp: boolean;
  isInitializing: boolean;
  isReady: boolean;
  setFarcasterUser: (user: FarcasterUser | null) => void;
  setFrameState: (state: Partial<FarcasterFrameState>) => void;
};

const FarcasterContext = createContext<FarcasterContextType | undefined>(
  undefined
);

export function FarcasterProvider({
  children,
  initialFrameState,
}: {
  children: React.ReactNode;
  initialFrameState?: FarcasterFrameState;
}) {
  // isMobile is available for layout-level decisions elsewhere; the SDK
  // initialization effect below does NOT depend on it.
  const { isMobile: _isMobile } = useMobileContext();
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUser | null>(
    null
  );
  const [frameState, setFrameState] = useState<FarcasterFrameState>({
    step: "welcome",
    ...initialFrameState,
  });
  const [isFarcasterMiniApp, setIsFarcasterMiniApp] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isReady, setIsReady] = useState(false);

  // Initialize Farcaster Mini App SDK with timeout and better error handling
  useEffect(() => {
    const initializeSDK = async () => {
      // Compute the URL-based detection synchronously up front so the
      // timeout / error fallbacks can also use it.
      const urlHasFarcasterParams = typeof window !== "undefined" && (
        window.location.search.includes("farcaster") ||
        window.location.search.includes("fid") ||
        window.location.pathname.includes("farcaster")
      );

      try {
        setIsInitializing(true);

        // Add timeout to prevent hanging
        const initTimeout = setTimeout(() => {
          console.warn("SDK initialization timeout, proceeding anyway");
          // Do NOT fall back to isMobile – being on mobile doesn't mean we're
          // inside a Farcaster host.
          setIsFarcasterMiniApp(urlHasFarcasterParams);
          setIsReady(true);
          setIsInitializing(false);
        }, 5000); // 5 second timeout

        // Detect Farcaster context via SDK first (most reliable)
        let miniAppDetected = false;
        try {
          const detector = (sdk as any).isInMiniApp;
          if (typeof detector === "function") {
            miniAppDetected = await Promise.race([
              detector(),
              new Promise(resolve => setTimeout(() => resolve(false), 2000))
            ]) as boolean;
          }
        } catch (error) {
          console.log("Mini app detection failed:", error);
        }

        const isMiniApp = miniAppDetected || urlHasFarcasterParams;
        setIsFarcasterMiniApp(isMiniApp);

        if (isMiniApp) {
          // Try to get user context with timeout
          try {
            const contextPromise = sdk.context;
            const context = await Promise.race([
              contextPromise,
              new Promise((_, reject) => setTimeout(() => reject(new Error("Context timeout")), 3000))
            ]) as any;

            if (context?.user) {
              setFarcasterUser({
                fid: context.user.fid,
                username: context.user.username || "",
                displayName: context.user.displayName || "",
                pfpUrl: context.user.pfpUrl || "",
                profile: {
                  bio: {
                    text: "",
                    mentions: [],
                  },
                },
              });
            }
          } catch (error) {
            console.log("User context not available:", error);
          }

          // Only call ready() when the SDK has confirmed we are actually
          // inside a Farcaster mini-app host. Calling it in a plain browser
          // (even on mobile) causes "ready call, not ready" log spam.
          if (miniAppDetected) {
            try {
              await Promise.race([
                sdk.actions.ready(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Ready timeout")), 2000))
              ]);
              console.log("Farcaster SDK ready() called successfully");
            } catch (error) {
              console.log("SDK ready() failed or timed out:", error);
              // Continue anyway – the app still works without it
            }
          }
        }

        clearTimeout(initTimeout);
        setIsReady(true);
        setIsInitializing(false);
      } catch (error) {
        console.error("SDK initialization error:", error);
        // Always mark as ready to prevent infinite loading.
        // Fall back to the URL-based check; never use isMobile alone.
        setIsFarcasterMiniApp(urlHasFarcasterParams);
        setIsReady(true);
        setIsInitializing(false);
      }
    };

    // Add small delay to ensure DOM is ready.
    // Run once on mount — the detection is based on the URL and SDK,
    // neither of which changes after the component mounts.
    const timer = setTimeout(initializeSDK, 100);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <FarcasterContext.Provider
      value={{
        farcasterUser,
        frameState,
        isFarcasterMiniApp,
        isInitializing,
        isReady,
        setFarcasterUser,
        setFrameState: (state) =>
          setFrameState((prev) => ({ ...prev, ...state })),
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcasterContext() {
  const context = useContext(FarcasterContext);
  if (context === undefined) {
    throw new Error(
      "useFarcasterContext must be used within a FarcasterProvider"
    );
  }
  return context;
}
