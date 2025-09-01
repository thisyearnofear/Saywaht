"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { FarcasterUser, FarcasterFrameState } from "@/farcaster/types";
import { useMobileContext } from "@/contexts/mobile-context";

type FarcasterContextType = {
  farcasterUser: FarcasterUser | null;
  frameState: FarcasterFrameState;
  isFarcasterMiniApp: boolean;
  setFarcasterUser: (user: FarcasterUser | null) => void;
  setFrameState: (state: Partial<FarcasterFrameState>) => void;
  initializeFarcaster: () => Promise<void>;
};

const FarcasterContext = createContext<FarcasterContextType | undefined>(undefined);

export function FarcasterProvider({ 
  children,
  initialFrameState
}: { 
  children: React.ReactNode;
  initialFrameState?: FarcasterFrameState;
}) {
  const { isMobile } = useMobileContext();
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUser | null>(null);
  const [frameState, setFrameState] = useState<FarcasterFrameState>({
    step: "welcome",
    ...initialFrameState
  });
  const [isFarcasterMiniApp, setIsFarcasterMiniApp] = useState(false);

  // Detect if we're running in a Farcaster mini app context
  useEffect(() => {
    const checkFarcasterContext = () => {
      // Check for Farcaster-specific headers or context
      const isFarcaster = typeof window !== 'undefined' && 
        (window.name.includes('farcaster') || 
         window.location.search.includes('farcaster') ||
         // Check for frame action data
         window.location.search.includes('fid'));
      
      setIsFarcasterMiniApp(isFarcaster || isMobile);
    };

    checkFarcasterContext();
  }, [isMobile]);

  const initializeFarcaster = async () => {
    try {
      // In a real implementation, this would fetch user data from Farcaster
      // For now, we'll set up the context properly
      console.log("Initializing Farcaster context");
    } catch (error) {
      console.error("Failed to initialize Farcaster context:", error);
    }
  };

  return (
    <FarcasterContext.Provider
      value={{
        farcasterUser,
        frameState,
        isFarcasterMiniApp,
        setFarcasterUser,
        setFrameState: (state) => setFrameState(prev => ({ ...prev, ...state })),
        initializeFarcaster
      }}
    >
      {children}
    </FarcasterContext.Provider>
  );
}

export function useFarcasterContext() {
  const context = useContext(FarcasterContext);
  if (context === undefined) {
    throw new Error("useFarcasterContext must be used within a FarcasterProvider");
  }
  return context;
}