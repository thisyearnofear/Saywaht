"use client";

import { useEffect, ReactNode } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useTemplateStore } from "@/stores/template-store";
import { useSceneStore } from "@/stores/scene-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { toast } from "sonner";

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const { isInitializing, isPanelsReady, initializeApp } = useEditorStore();
  const { selectedTemplate, applySelectedTemplate, clearSelectedTemplate } = useTemplateStore();
  const { initializeScenes } = useSceneStore();
  const { activeProject } = useProjectStore();
  const { copySelectedClip, pasteClipAtPlayhead, selectedClips, removeClipFromTrack } = useTimelineStore();
  const { currentTime, toggle, isPlaying } = usePlaybackStore();

  // Initialize editor on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Initialize scenes when project loads
  useEffect(() => {
    if (activeProject && isPanelsReady) {
      const scenes = activeProject.scenes || [];
      const currentSceneId = activeProject.currentSceneId;
      initializeScenes(scenes, currentSceneId);
    }
  }, [activeProject, isPanelsReady, initializeScenes]);

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

  // Global keyboard shortcuts
  useEffect(() => {
    if (!isPanelsReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Cmd/Ctrl + C - Copy
      if (modKey && e.key === 'c') {
        e.preventDefault();
        if (selectedClips.length > 0) {
          copySelectedClip();
          toast.success('Clip copied');
        }
        return;
      }

      // Cmd/Ctrl + V - Paste
      if (modKey && e.key === 'v') {
        e.preventDefault();
        pasteClipAtPlayhead(currentTime);
        toast.success('Clip pasted');
        return;
      }

      // Delete/Backspace - Remove selected clip
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClips.length > 0) {
        e.preventDefault();
        selectedClips.forEach(({ trackId, clipId }) => {
          removeClipFromTrack(trackId, clipId);
        });
        toast.success('Clip removed');
        return;
      }

      // Space - Play/Pause
      if (e.key === ' ' && !e.shiftKey && !modKey) {
        e.preventDefault();
        toggle();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelsReady, selectedClips, copySelectedClip, pasteClipAtPlayhead, currentTime, removeClipFromTrack, toggle]);

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
