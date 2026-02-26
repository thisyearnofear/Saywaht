"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";
import { useFarcasterFrame } from "@/farcaster/hooks/use-farcaster-frame";

/**
 * Smart navigation hook that handles routing differently for:
 * - Base app: Uses Next.js router.push() for full navigation
 * - Farcaster Mini App: Uses hash-based navigation to stay within WebView
 * 
 * This prevents the Mini App from exiting its context when navigating
 */
export function useSmartNavigation() {
  const router = useRouter();
  const { isFarcasterMiniApp, setFrameState } = useFarcasterContext();
  const { handleMiniAppNavigation } = useFarcasterFrame();

  /**
   * Navigate to a path
   * In Farcaster Mini App: uses hash-based navigation (#path)
   * In Base app: uses Next.js router.push()
   */
  const navigate = useCallback((path: string) => {
    if (isFarcasterMiniApp) {
      // In Mini App, use hash-based navigation to stay within WebView
      const hash = path.startsWith("/") ? path.slice(1) : path;
      window.location.hash = hash ? `#${hash}` : "";
      
      // Also update frame state based on the path
      if (path.includes("/mint") || path.includes("#mint")) {
        setFrameState({ step: "minting" });
      } else if (path.includes("/templates") || path.includes("#templates")) {
        setFrameState({ step: "templates" });
      } else if (path.includes("/editor") || path.includes("#editor")) {
        setFrameState({ step: "recording" });
      } else if (path.includes("/trade") || path.includes("#trade")) {
        setFrameState({ step: "trade" });
      }
    } else {
      // In base app, use regular Next.js navigation
      router.push(path);
    }
  }, [isFarcasterMiniApp, router, setFrameState]);

  /**
   * Navigate to mint page with optional project ID
   */
  const navigateToMint = useCallback((projectId?: string) => {
    if (isFarcasterMiniApp) {
      window.location.hash = projectId ? `#mint/${projectId}` : "#mint";
      setFrameState({ step: "minting", projectId });
    } else {
      const path = projectId ? `/mint/${projectId}` : "/mint";
      router.push(path);
    }
  }, [isFarcasterMiniApp, router, setFrameState]);

  /**
   * Navigate to templates page
   */
  const navigateToTemplates = useCallback(() => {
    if (isFarcasterMiniApp) {
      window.location.hash = "#templates";
      setFrameState({ step: "templates" });
    } else {
      router.push("/templates");
    }
  }, [isFarcasterMiniApp, router, setFrameState]);

  /**
   * Navigate to a specific template by ID
   */
  const navigateToTemplate = useCallback((templateId: string) => {
    if (isFarcasterMiniApp) {
      window.location.hash = `#templates/${templateId}`;
      setFrameState({ step: "templates", templateId });
    } else {
      router.push(`/templates/${templateId}`);
    }
  }, [isFarcasterMiniApp, router, setFrameState]);

  /**
   * Navigate to editor
   */
  const navigateToEditor = useCallback(() => {
    if (isFarcasterMiniApp) {
      handleMiniAppNavigation("editor");
    } else {
      router.push("/editor");
    }
  }, [isFarcasterMiniApp, router, handleMiniAppNavigation]);

  /**
   * Navigate to trade/market page
   */
  const navigateToTrade = useCallback(() => {
    if (isFarcasterMiniApp) {
      handleMiniAppNavigation("trade");
    } else {
      router.push("/trade");
    }
  }, [isFarcasterMiniApp, router, handleMiniAppNavigation]);

  /**
   * Go back - uses history.back() in both contexts
   */
  const goBack = useCallback(() => {
    if (isFarcasterMiniApp && window.location.hash) {
      // In Mini App with hash, just remove the hash to go back
      window.history.back();
    } else {
      router.back();
    }
  }, [isFarcasterMiniApp, router]);

  return {
    navigate,
    navigateToMint,
    navigateToTemplates,
    navigateToTemplate,
    navigateToEditor,
    navigateToTrade,
    goBack,
    isFarcasterMiniApp,
  };
}
