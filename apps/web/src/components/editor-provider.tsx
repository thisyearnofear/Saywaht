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

  // Initialize scenes when project loads
  useEffect(() => {
    if (activeProject && isPanelsReady) {
      const scenes = activeProject.scenes || [];
      const currentSceneId = activeProject.currentSceneId;
      initializeScenes(scenes, currentSceneId);
    }
  }, [activeProject, isPanelsReady, initializeScenes]);

  // Safety-net: apply stale template
  useEffect(() => {
    if (isPanelsReady && selectedTemplate) {
      applySelectedTemplate().then((success) => {
        if (success) {
          clearSelectedTemplate();
        }
      });
    }
  }, [isPanelsReady, selectedTemplate, applySelectedTemplate, clearSelectedTemplate]);

  // Sync timeline duration to playback store
  useEffect(() => {
    if (isPanelsReady) {
      const totalDuration = getTotalDuration();
      // Ensure we have at least a tiny bit of duration if clips exist, to allow playback progress
      const tracksWithClips = tracks.some(t => t.clips.length > 0);
      const syncedDuration = totalDuration === 0 && tracksWithClips ? 0.1 : totalDuration;
      setDuration(syncedDuration);
    }
  }, [tracks, isPanelsReady, getTotalDuration, setDuration]);

  // Global keyboard shortcuts
  useEffect(() => {
    if (!isPanelsReady) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === 'c') {
        e.preventDefault();
        if (selectedClips.length > 0) {
          copySelectedClip();
          toast.success('Clip copied');
        }
        return;
      }

      if (modKey && e.key === 'v') {
        e.preventDefault();
        pasteClipAtPlayhead(currentTime);
        toast.success('Clip pasted');
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClips.length > 0) {
        e.preventDefault();
        selectedClips.forEach(({ trackId, clipId }) => {
          removeClipFromTrack(trackId, clipId);
        });
        toast.success('Clip removed');
        return;
      }

      if (e.key === ' ' && !e.shiftKey && !modKey) {
        e.preventDefault();
        toggle();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelsReady, selectedClips, copySelectedClip, pasteClipAtPlayhead, currentTime, removeClipFromTrack, toggle]);

  // Show loading screen only if panels are not ready at all
  if (!isPanelsReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Loading Studio</p>
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
