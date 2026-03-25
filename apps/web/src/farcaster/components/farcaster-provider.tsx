"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { FarcasterUser, FarcasterFrameState } from "@/farcaster/types";
import { useMobileContext } from "@/contexts/mobile-context";
import { getFarcasterSdk } from "@/lib/farcaster-sdk";
import { FarcasterSplashScreen } from "./farcaster-splash-screen";

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
  const [isSplashComplete, setIsSplashComplete] = useState(false);

  // Initialize Farcaster Mini App SDK with optimized performance
  useEffect(() => {
    const initializeSDK = async () => {
      // Compute the URL-based detection
      const urlHasMiniAppParams = typeof window !== "undefined" && (
        window.location.search.includes("farcaster") ||
        window.location.search.includes("fid") ||
        window.location.search.includes("base") ||
        window.location.search.includes("cbwallet") ||
        window.location.pathname.includes("farcaster")
      );

      // Detection: Are we in a frame? (Common for Mini Apps)
      const isInFrame = typeof window !== "undefined" && window.self !== window.top;

      // Fast path: if no indicators, skip SDK detection for better performance on desktop
      if (!urlHasMiniAppParams && !isInFrame) {
        setIsFarcasterMiniApp(false);
        setIsReady(true);
        setIsInitializing(false);
        return;
      }

      // We're on a Farcaster URL — assume mini app mode immediately
      // This prevents a flash between mount and SDK detection
      setIsFarcasterMiniApp(true);

      try {
        setIsInitializing(true);

        // Dynamically load SDK to avoid SSR/WebView issues
        const sdk = await getFarcasterSdk();

        if (!sdk) {
          console.log("SDK not available, skipping Farcaster initialization");
          setIsReady(true);
          setIsInitializing(false);
          return;
        }

        // CRITICAL: Call ready() IMMEDIATELY after SDK loads to dismiss
        // Farcaster's native splash screen as fast as possible.
        // Context/user fetching happens in the background after this.
        try {
          await Promise.race([
            sdk.actions.ready(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Ready timeout")), 1500))
          ]);
          console.log("Farcaster SDK ready() called successfully");
        } catch (error) {
          console.warn("sdk.actions.ready() failed or timed out:", error);
        }

        // Now fetch context/user in the background (non-blocking for UI)
        setIsReady(true);
        setIsInitializing(false);

        // Background: fetch user context
        try {
          const context = await Promise.race([
            sdk.context,
            new Promise<null>(resolve => setTimeout(() => resolve(null), 3000))
          ]);

          if (context && (context as any)?.user) {
            const user = (context as any).user;
            setFarcasterUser({
              fid: user.fid,
              username: user.username || "",
              displayName: user.displayName || "",
              pfpUrl: user.pfpUrl || "",
              profile: {
                bio: {
                  text: "",
                  mentions: [],
                },
              },
            });
          }
          console.log("Farcaster SDK initialization complete");
        } catch (error) {
          console.log("Context fetch failed (non-critical):", error);
        }
      } catch (error) {
        console.error("SDK initialization error:", error);
        setIsReady(true);
        setIsInitializing(false);
      }
    };

    // Start immediately — no delay needed, useEffect already runs after mount
    initializeSDK();
    return () => {};
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize stable setters to prevent loops in consumers
  const updateFrameState = useCallback((state: Partial<FarcasterFrameState>) => {
    setFrameState((prev) => ({ ...prev, ...state }));
  }, []);

  const contextValue = useMemo(() => ({
    farcasterUser,
    frameState,
    isFarcasterMiniApp,
    isInitializing,
    isReady,
    setFarcasterUser,
    setFrameState: updateFrameState,
  }), [farcasterUser, frameState, isFarcasterMiniApp, isInitializing, isReady, updateFrameState]);

  return (
    <FarcasterContext.Provider value={contextValue}>
      {isFarcasterMiniApp && (!isReady || !isSplashComplete) && (
        <FarcasterSplashScreen 
          isVisible={!isReady || !isSplashComplete} 
          onComplete={() => setIsSplashComplete(true)} 
        />
      )}
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
