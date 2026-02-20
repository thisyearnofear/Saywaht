"use client";

import { useEffect, ReactNode } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useTemplateStore } from "@/stores/template-store";
import { useSceneStore } from "@/stores/scene-store";
import { useProjectStore } from "@/stores/project-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { usePlaybackStore } from "@/stores/playback-store";
import { toast } from "sonner";
import { HistorySync } from "./editor/history-sync";

interface EditorProviderProps {
  children: ReactNode;
}

export function EditorProvider({ children }: EditorProviderProps) {
  const { isInitializing, isPanelsReady, initializeApp } = useEditorStore();
  const { selectedTemplate, applySelectedTemplate, clearSelectedTemplate } = useTemplateStore();
  const { initializeScenes } = useSceneStore();
  const { activeProject } = useProjectStore();
  const { copySelectedClip, pasteClipAtPlayhead, selectedClips, removeClipFromTrack, tracks, getTotalDuration } = useTimelineStore();
  const { currentTime, toggle, isPlaying, setDuration } = usePlaybackStore();

  // Initialize editor on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // Sync timeline duration to playback store
  useEffect(() => {
    if (isPanelsReady) {
      const duration = getTotalDuration();
      setDuration(duration);
    }
  }, [tracks, isPanelsReady, getTotalDuration, setDuration]);

  // Initialize scenes when project loads
  useEffect(() => {
    if (activeProject && isPanelsReady) {
      const scenes = activeProject.scenes || [];
      const currentSceneId = activeProject.currentSceneId;
      initializeScenes(scenes, currentSceneId);
    }
  }, [activeProject, isPanelsReady, initializeScenes]);

  // Safety-net: if a selectedTemplate is still set when the editor mounts
  // (e.g. the user navigated directly to /editor with a stale store), apply
  // it now.  Under the normal use-client → /editor flow this effect is a
  // no-op because use-client already awaits the apply and clears the template
  // before navigating.  We intentionally do NOT pass a projectName here so
  // that a new project is only created when there isn't one already.
  useEffect(() => {
    if (isPanelsReady && selectedTemplate) {
      console.log('[EditorProvider] Applying stale selected template:', selectedTemplate.name);
      applySelectedTemplate().then((success) => {
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
  return (
    <>
      <HistorySync />
      {children}
    </>
  );
}
