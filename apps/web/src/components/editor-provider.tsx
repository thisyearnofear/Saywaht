"use client";

import { useEffect } from "@/lib/hooks-provider";

interface ReactNode {
  [key: string]: any;
}

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const { isInitializing, isPanelsReady, initializeApp } = useEditorStore();

  // Use custom useEffect hook
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Show loading screen while initializing
  if (isInitializing || !isPanelsReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="h-8 w-8 animate-spin text-muted-foreground">⟳</span>
          <p className="text-sm text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  // App is ready, render children
  return <>{children}</>;
}

// Import store after defining the types to avoid ordering issues
import { useEditorStore } from "@/stores/editor-store";
