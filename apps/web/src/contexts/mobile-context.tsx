"use client";

import * as React from "react";
const { createContext, useContext, useState, useEffect } = React;
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileOrientation } from "@/hooks/use-mobile-orientation";

type MobileContextType = {
  isMobile: boolean;
  orientation: "portrait" | "landscape" | undefined;
  isEditorMobileMode: boolean;
  toggleEditorMobileMode: () => void;
  enableEditorMobileMode: () => void;
  disableEditorMobileMode: () => void;
};

const MobileContext = createContext<MobileContextType | undefined>(undefined);

export function MobileProvider({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const orientation = useMobileOrientation();
  const [isEditorMobileMode, setIsEditorMobileMode] = useState(false);

  // Auto-enable mobile mode when on mobile devices
  useEffect(() => {
    if (isMobile) {
      setIsEditorMobileMode(true);
    }
  }, [isMobile]);

  const toggleEditorMobileMode = () => {
    setIsEditorMobileMode((prev: boolean) => !prev);
  };

  const enableEditorMobileMode = () => {
    setIsEditorMobileMode(true);
  };

  const disableEditorMobileMode = () => {
    setIsEditorMobileMode(false);
  };

  return (
    <MobileContext.Provider
      value={{
        isMobile,
        orientation,
        isEditorMobileMode,
        toggleEditorMobileMode,
        enableEditorMobileMode,
        disableEditorMobileMode,
      }}
    >
      {children}
    </MobileContext.Provider>
  );
}

export function useMobileContext() {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error("useMobileContext must be used within a MobileProvider");
  }
  return context;
}