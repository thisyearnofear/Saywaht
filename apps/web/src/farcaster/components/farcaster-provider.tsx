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
  const { isMobile } = useMobileContext();
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
      try {
        setIsInitializing(true);

        // Add timeout to prevent hanging
        const initTimeout = setTimeout(() => {
          console.warn("SDK initialization timeout, proceeding anyway");
          setIsFarcasterMiniApp(isMobile);
          setIsReady(true);
          setIsInitializing(false);
        }, 5000); // 5 second timeout

        let miniAppDetected = false;
        try {
          // Check if we're in a Farcaster context
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

        // Also check URL parameters for Farcaster context
        const urlHasFarcasterParams = typeof window !== "undefined" && (
          window.location.search.includes("farcaster") ||
          window.location.search.includes("fid") ||
          window.location.pathname.includes("farcaster")
        );

        const isMiniApp = miniAppDetected || urlHasFarcasterParams || isMobile;
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

          // Try to call ready() with timeout
          try {
            await Promise.race([
              sdk.actions.ready(),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Ready timeout")), 2000))
            ]);
            console.log("Farcaster SDK ready() called successfully");
          } catch (error) {
            console.log("SDK ready() failed or timed out:", error);
            // Continue anyway - some contexts don't require ready()
          }
        }

        clearTimeout(initTimeout);
        setIsReady(true);
        setIsInitializing(false);
      } catch (error) {
        console.error("SDK initialization error:", error);
        // Always mark as ready to prevent infinite loading
        setIsFarcasterMiniApp(isMobile);
        setIsReady(true);
        setIsInitializing(false);
      }
    };

    // Add small delay to ensure DOM is ready
    const timer = setTimeout(initializeSDK, 100);
    return () => clearTimeout(timer);
  }, [isMobile]);

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
