"use client";

import { useEffect, useRef, ReactNode } from "react";
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
  const { selectedTemplate, applySelectedTemplate, clearSelectedTemplate, cleanupBlobUrls } = useTemplateStore();
  const { initializeScenes } = useSceneStore();
  const { activeProject } = useProjectStore();
  const { copySelectedClip, pasteClipAtPlayhead, selectedClips, removeClipFromTrack, tracks, getTotalDuration } = useTimelineStore();
  const { currentTime, toggle, isPlaying, setDuration } = usePlaybackStore();

  // Initialize editor on mount
  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  // NEW: Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 EditorProvider unmounting, cleaning up blob URLs');
      cleanupBlobUrls();
    };
  }, [cleanupBlobUrls]);

  // Initialize scenes when project loads
  useEffect(() => {
    if (activeProject && isPanelsReady) {
      const scenes = activeProject.scenes || [];
      const currentSceneId = activeProject.currentSceneId;
      initializeScenes(scenes, currentSceneId);
    }
  }, [activeProject, isPanelsReady, initializeScenes]);

  // Fix #4: ref guard so the safety-net can only fire ONCE per template.
  // Without this, if clearSelectedTemplate's store update is delayed (i.e.,
  // Zustand batches the write), the effect re-runs before selectedTemplate
  // becomes null and calls applySelectedTemplate a second time, producing
  // duplicate tracks and clips in the timeline.
  const isApplyingRef = useRef(false);
  const lastAppliedTemplateId = useRef<string | null>(null);

  // Safety-net: apply stale template only if editor is empty
  const hasContent = tracks.some(t => t.clips.length > 0);
  useEffect(() => {
    if (!isPanelsReady || !selectedTemplate || hasContent) return;

    // Reset the guard when the selected template changes
    if (lastAppliedTemplateId.current !== selectedTemplate.id) {
      isApplyingRef.current = false;
      lastAppliedTemplateId.current = selectedTemplate.id;
    }

    // Don't fire again for the same template
    if (isApplyingRef.current) return;
    isApplyingRef.current = true;

    applySelectedTemplate().then((success) => {
      if (success) {
        clearSelectedTemplate();
      } else {
        // Reset so a future retry attempt works
        isApplyingRef.current = false;
      }
    });
  }, [isPanelsReady, selectedTemplate, hasContent, applySelectedTemplate, clearSelectedTemplate]);

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
