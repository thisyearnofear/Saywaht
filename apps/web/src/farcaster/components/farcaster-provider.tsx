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

  // Initialize Farcaster Mini App SDK
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        setIsInitializing(true);
        
        // Enhanced Mini App context detection for 2025 standards
        const isFarcaster =
          typeof window !== "undefined" &&
          (window.name.includes("farcaster") ||
            window.location.search.includes("farcaster") ||
            window.location.search.includes("fid") ||
            window.location.pathname.includes("/farcaster") ||
            // Check for Farcaster user agent
            navigator.userAgent.includes("Farcaster") ||
            // Check for frame context indicators
            window.location.search.includes("fc_frame") ||
            // Check for parent window context (iframe detection)
            window.parent !== window ||
            // Check for Farcaster referrer
            document.referrer.includes("farcaster") ||
            document.referrer.includes("warpcast"));

        const isMiniApp = isFarcaster || isMobile;
        setIsFarcasterMiniApp(isMiniApp);

        if (isMiniApp) {
          // Get user context if available (before calling ready)
          try {
            const context = await sdk.context;
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
            // No user context available (expected for some Mini App contexts)
            console.log("No user context available:", error);
          }
          
          // Call sdk.actions.ready() to signal the mini app is ready
          try {
            await sdk.actions.ready();
            console.log("Farcaster SDK ready() called successfully");
          } catch (error) {
            console.error("Failed to call sdk.actions.ready():", error);
          }
        }
        
        // Mark as ready after initialization
        setIsReady(true);
        setIsInitializing(false);
      } catch (error) {
        console.error("Failed to initialize Farcaster SDK:", error);
        // Fallback: still mark as ready even if initialization fails
        setIsFarcasterMiniApp(isMobile);
        setIsReady(true);
        setIsInitializing(false);
      }
    };

    initializeSDK();
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
