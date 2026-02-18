"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { FarcasterUser, FarcasterFrameState } from "@/farcaster/types";
import { useMobileContext } from "@/contexts/mobile-context";
import { getFarcasterSdk } from "@/lib/farcaster-sdk";

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

  // Initialize Farcaster Mini App SDK with optimized performance
  useEffect(() => {
    const initializeSDK = async () => {
      // Compute the URL-based detection synchronously up front
      const urlHasFarcasterParams = typeof window !== "undefined" && (
        window.location.search.includes("farcaster") ||
        window.location.search.includes("fid") ||
        window.location.pathname.includes("farcaster")
      );

      // Fast path: if no Farcaster indicators in URL, skip SDK detection
      if (!urlHasFarcasterParams) {
        setIsFarcasterMiniApp(false);
        setIsReady(true);
        setIsInitializing(false);
        return;
      }

      try {
        setIsInitializing(true);

        // Single timeout for entire initialization (3s max)
        const initTimeout = setTimeout(() => {
          console.warn("SDK initialization timeout, proceeding anyway");
          setIsFarcasterMiniApp(urlHasFarcasterParams);
          setIsReady(true);
          setIsInitializing(false);
        }, 3000);

        // Dynamically load SDK to avoid SSR/WebView issues
        const sdk = await getFarcasterSdk();
        
        if (!sdk) {
          console.log("SDK not available, skipping Farcaster initialization");
          setIsFarcasterMiniApp(urlHasFarcasterParams);
          setIsReady(true);
          setIsInitializing(false);
          clearTimeout(initTimeout);
          return;
        }

        // Detect Farcaster context via SDK - this is the ONLY reliable way
        let miniAppDetected = false;
        try {
          const detector = (sdk as any).isInMiniApp;
          if (typeof detector === "function") {
            miniAppDetected = await Promise.race([
              detector(2000), // 2s timeout for detection
              new Promise(resolve => setTimeout(() => resolve(false), 2000))
            ]) as boolean;
          }
        } catch (error) {
          console.log("Mini app detection failed:", error);
        }

        // Only consider it a Farcaster Mini App if SDK confirms it
        // URL params alone are not sufficient - they could be from a regular browser
        const isMiniApp = miniAppDetected;
        setIsFarcasterMiniApp(isMiniApp || urlHasFarcasterParams);

        // CRITICAL: Only call ready() if SDK confirms we're in a Mini App
        // Calling ready() outside a Mini App context causes "Ready call, Not Ready" error
        if (miniAppDetected) {
          console.log("Mini App detected by SDK, calling ready()...");
          
          // Run context fetch and ready() in parallel for speed
          const contextPromise = (async () => {
            try {
              const context = await Promise.race([
                sdk.context,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Context timeout")), 2000))
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
          })();

          const readyPromise = (async () => {
            try {
              await Promise.race([
                sdk.actions.ready(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Ready timeout")), 2000))
              ]);
              console.log("Farcaster SDK ready() called successfully");
            } catch (error) {
              console.log("SDK ready() failed or timed out:", error);
            }
          })();

          // Wait for both to complete (in parallel)
          await Promise.allSettled([contextPromise, readyPromise]);
        } else {
          console.log("Not in Farcaster Mini App context (SDK detection returned false), skipping ready()");
        }

        clearTimeout(initTimeout);
        setIsReady(true);
        setIsInitializing(false);
      } catch (error) {
        console.error("SDK initialization error:", error);
        setIsFarcasterMiniApp(urlHasFarcasterParams);
        setIsReady(true);
        setIsInitializing(false);
      }
    };

    // Minimal delay for DOM readiness
    const timer = setTimeout(initializeSDK, 50);
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
