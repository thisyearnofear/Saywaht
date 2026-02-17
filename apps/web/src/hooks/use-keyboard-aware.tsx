"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect and respond to virtual keyboard state on mobile devices
 * Uses the Visual Viewport API for accurate keyboard height detection
 */
export function useKeyboardAware() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Store the initial viewport height
    const initialHeight = window.innerHeight;
    setViewportHeight(initialHeight);

    // Check if Visual Viewport API is supported
    if ("visualViewport" in window && window.visualViewport) {
      const handleVisualViewportResize = () => {
        const vv = window.visualViewport;
        if (!vv) return;

        // Calculate keyboard height
        const currentHeight = vv.height;
        const keyboardVisible = initialHeight - currentHeight > 100;
        
        setIsKeyboardOpen(keyboardVisible);
        setKeyboardHeight(keyboardVisible ? initialHeight - currentHeight : 0);
        setViewportHeight(currentHeight);
      };

      // Listen for visual viewport changes
      window.visualViewport.addEventListener("resize", handleVisualViewportResize);
      window.visualViewport.addEventListener("scroll", handleVisualViewportResize);

      // Initial check
      handleVisualViewportResize();

      return () => {
        window.visualViewport?.removeEventListener("resize", handleVisualViewportResize);
        window.visualViewport?.removeEventListener("scroll", handleVisualViewportResize);
      };
    } else {
      // Fallback for browsers without Visual Viewport API
      const handleWindowResize = () => {
        const currentHeight = window.innerHeight;
        const heightDiff = initialHeight - currentHeight;
        const keyboardVisible = heightDiff > 100 && heightDiff < initialHeight * 0.5;

        setIsKeyboardOpen(keyboardVisible);
        setKeyboardHeight(keyboardVisible ? heightDiff : 0);
        setViewportHeight(currentHeight);
      };

      window.addEventListener("resize", handleWindowResize);
      
      // Also listen for focus events on input elements
      const handleFocus = () => {
        // Small delay to let the keyboard open
        setTimeout(handleWindowResize, 100);
      };

      const handleBlur = () => {
        setTimeout(handleWindowResize, 100);
      };

      document.addEventListener("focusin", handleFocus);
      document.addEventListener("focusout", handleBlur);

      return () => {
        window.removeEventListener("resize", handleWindowResize);
        document.removeEventListener("focusin", handleFocus);
        document.removeEventListener("focusout", handleBlur);
      };
    }
  }, []);

  return {
    keyboardHeight,
    isKeyboardOpen,
    viewportHeight,
    // CSS variable value for inline styles
    keyboardOffset: `${keyboardHeight}px`,
  };
}

/**
 * Hook to get the real viewport height accounting for mobile browser UI
 * Useful for 100vh issues on mobile browsers
 */
export function useRealViewportHeight() {
  const [vh, setVh] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const setRealVh = () => {
      const vh = window.innerHeight * 0.01;
      setVh(vh);
      document.documentElement.style.setProperty("--real-vh", `${vh}px`);
    };

    setRealVh();
    window.addEventListener("resize", setRealVh);
    
    // Also update on orientation change
    window.addEventListener("orientationchange", () => {
      setTimeout(setRealVh, 100);
    });

    return () => {
      window.removeEventListener("resize", setRealVh);
      window.removeEventListener("orientationchange", setRealVh);
    };
  }, []);

  return vh;
}
