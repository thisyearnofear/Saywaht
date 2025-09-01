"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { FarcasterUser, FarcasterFrameState } from "@/farcaster/types";
import { useMobileContext } from "@/contexts/mobile-context";
import { sdk } from "@farcaster/miniapp-sdk";

type FarcasterContextType = {
  farcasterUser: FarcasterUser | null;
  frameState: FarcasterFrameState;
  isFarcasterMiniApp: boolean;
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

  // Initialize Farcaster Mini App SDK
  useEffect(() => {
    const initializeSDK = async () => {
      try {
        // Single consolidated ready call for all contexts
        await sdk.actions.ready();

        // Detect Mini App context and get user data
        const isFarcaster =
          typeof window !== "undefined" &&
          (window.name.includes("farcaster") ||
            window.location.search.includes("farcaster") ||
            window.location.search.includes("fid") ||
            window.location.pathname.includes("/farcaster"));

        const isMiniApp = isFarcaster || isMobile;
        setIsFarcasterMiniApp(isMiniApp);

        // Get user context if in Mini App
        if (isMiniApp) {
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
          }
        }
      } catch (error) {
        console.error("Failed to initialize Farcaster SDK:", error);
        // Fallback: still mark as ready even if initialization fails
        setIsFarcasterMiniApp(isMobile);
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
