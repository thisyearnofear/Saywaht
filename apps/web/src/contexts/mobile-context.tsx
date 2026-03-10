"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
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

export function MobileProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const orientation = useMobileOrientation();
  const [isEditorMobileMode, setIsEditorMobileMode] = useState(false);

  // Auto-enable mobile mode when on mobile devices, but allow desktop users to choose
  useEffect(() => {
    if (isMobile) {
      setIsEditorMobileMode(true);
    } else {
      // On desktop, check if user has a preference stored
      const savedPreference = localStorage.getItem("editor-mobile-mode");
      if (savedPreference !== null) {
        setIsEditorMobileMode(savedPreference === "true");
      } else {
        // No preference saved — default to desktop mode
        setIsEditorMobileMode(false);
      }
    }
  }, [isMobile]);

  // Save user preference when they manually toggle
  const toggleEditorMobileMode = () => {
    if (isMobile) return; // Prevent toggling on real mobile devices

    setIsEditorMobileMode((prev: boolean) => {
      const newValue = !prev;
      // Only save preference on desktop
      localStorage.setItem("editor-mobile-mode", newValue.toString());
      return newValue;
    });
  };

  const enableEditorMobileMode = () => {
    if (isMobile) return;
    setIsEditorMobileMode(true);
  };

  const disableEditorMobileMode = () => {
    if (isMobile) return; // Never disable on mobile devices
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
