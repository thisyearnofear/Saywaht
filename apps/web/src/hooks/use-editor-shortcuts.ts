"use client";

import { useEffect } from "react";
import { usePlaybackStore } from "@/stores/playback-store";
import { useEditorStore } from "@/stores/editor-store";
import { usePanelStore } from "@/stores/panel-store";
import { toast } from "@/hooks/use-toast";

/**
 * Keyboard shortcuts for the video editor
 * 
 * Shortcuts:
 * - Space: Play/Pause
 * - T: Toggle Timeline
 * - F: Toggle Fit/Fill mode
 * - Z: Reset Zoom to 100%
 * - +/=: Zoom In
 * - -: Zoom Out
 * - M: Toggle Mute
 * - Left Arrow: Seek backward 1s
 * - Right Arrow: Seek forward 1s
 * - Shift + Left Arrow: Seek backward 5s
 * - Shift + Right Arrow: Seek forward 5s
 * - Home: Go to start
 * - End: Go to end
 */
export function useEditorShortcuts() {
  const { isPlaying, toggle, toggleMute, seek, currentTime, duration } = usePlaybackStore();
  const { videoObjectFit, toggleVideoObjectFit, previewZoom, setPreviewZoom, resetPreviewZoom } = useEditorStore();
  const { toggleTimelineCollapse, isTimelineCollapsed } = usePanelStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      // Prevent default for shortcuts we handle
      const shouldPreventDefault = [
        " ",
        "t",
        "f",
        "z",
        "+",
        "=",
        "-",
        "m",
        "ArrowLeft",
        "ArrowRight",
        "Home",
        "End",
      ].includes(e.key.toLowerCase());

      if (shouldPreventDefault) {
        e.preventDefault();
      }

      // Handle shortcuts
      switch (e.key.toLowerCase()) {
        case " ": // Space - Play/Pause
          toggle();
          toast({
            title: isPlaying ? "Paused" : "Playing",
            duration: 1000,
          });
          break;

        case "t": // T - Toggle Timeline
          toggleTimelineCollapse();
          toast({
            title: isTimelineCollapsed ? "Timeline Shown" : "Timeline Hidden",
            duration: 1000,
          });
          break;

        case "f": // F - Toggle Fit/Fill
          toggleVideoObjectFit();
          toast({
            title: videoObjectFit === "contain" ? "Fill Mode" : "Fit Mode",
            description: videoObjectFit === "contain" 
              ? "Video will fill the frame" 
              : "Full video will be visible",
            duration: 1500,
          });
          break;

        case "z": // Z - Reset Zoom
          resetPreviewZoom();
          toast({
            title: "Zoom Reset",
            description: "Preview zoom set to 100%",
            duration: 1000,
          });
          break;

        case "+":
        case "=": // + or = - Zoom In
          setPreviewZoom(previewZoom + 0.25);
          toast({
            title: `Zoom: ${Math.round((previewZoom + 0.25) * 100)}%`,
            duration: 1000,
          });
          break;

        case "-": // - - Zoom Out
          setPreviewZoom(previewZoom - 0.25);
          toast({
            title: `Zoom: ${Math.round((previewZoom - 0.25) * 100)}%`,
            duration: 1000,
          });
          break;

        case "m": // M - Toggle Mute
          toggleMute();
          toast({
            title: "Audio " + (toggleMute ? "Muted" : "Unmuted"),
            duration: 1000,
          });
          break;

        case "arrowleft": // Left Arrow - Seek Backward
          if (e.shiftKey) {
            seek(Math.max(0, currentTime - 5));
            toast({ title: "⏪ -5s", duration: 800 });
          } else {
            seek(Math.max(0, currentTime - 1));
            toast({ title: "⏪ -1s", duration: 800 });
          }
          break;

        case "arrowright": // Right Arrow - Seek Forward
          if (e.shiftKey) {
            seek(Math.min(duration, currentTime + 5));
            toast({ title: "⏩ +5s", duration: 800 });
          } else {
            seek(Math.min(duration, currentTime + 1));
            toast({ title: "⏩ +1s", duration: 800 });
          }
          break;

        case "home": // Home - Go to start
          seek(0);
          toast({ title: "⏮️ Start", duration: 800 });
          break;

        case "end": // End - Go to end
          seek(duration);
          toast({ title: "⏭️ End", duration: 800 });
          break;

        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    isPlaying,
    toggle,
    toggleMute,
    seek,
    currentTime,
    duration,
    videoObjectFit,
    toggleVideoObjectFit,
    previewZoom,
    setPreviewZoom,
    resetPreviewZoom,
    toggleTimelineCollapse,
    isTimelineCollapsed,
  ]);
}
