"use client";

import { useEffect, ReactNode } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useTemplateStore } from "@/stores/template-store";

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const { isInitializing, isPanelsReady, initializeApp } = useEditorStore();
  const { selectedTemplate, applySelectedTemplate, clearSelectedTemplate } = useTemplateStore();

  // Initialize editor on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Apply selected template after editor is ready
  useEffect(() => {
    if (isPanelsReady && selectedTemplate) {
      console.log('Applying selected template:', selectedTemplate.name);
      applySelectedTemplate(selectedTemplate.name).then((success) => {
        if (success) {
          clearSelectedTemplate();
        }
      });
    }
  }, [isPanelsReady, selectedTemplate, applySelectedTemplate, clearSelectedTemplate]);

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
