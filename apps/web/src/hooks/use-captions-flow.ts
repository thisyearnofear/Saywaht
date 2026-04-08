"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { TimelineTrack } from "@/stores/timeline-store";
import type { MediaItem } from "@/stores/media-store";
import type { TextElement } from "@/lib/types";
import type { TranscriptionLanguage } from "@/constants/transcription-constants";
import {
  CAPTION_POSITION_Y,
  type CaptionPosition,
  generateCaptionsFromTimeline,
  updateCaptionGroupStyle,
  type CaptionGenerationResult,
} from "@/lib/transcription/caption-pipeline";

interface UseCaptionsFlowParams {
  tracks: TimelineTrack[];
  mediaItems: MediaItem[];
  addTextElement: (element: Omit<TextElement, "id">) => string;
  updateTextElement: (id: string, updates: Partial<TextElement>) => void;
  getCaptionGroupIds: () => string[];
  getCaptionElements: (groupId?: string) => TextElement[];
  deleteCaptionGroup: (groupId: string) => void;
  updateCaptionGroup: (groupId: string, updates: Partial<TextElement>) => void;
  preferredCaptionGroupId?: string | null;
}

export function useCaptionsFlow({
  tracks,
  mediaItems,
  addTextElement,
  updateTextElement,
  getCaptionGroupIds,
  getCaptionElements,
  deleteCaptionGroup,
  updateCaptionGroup,
  preferredCaptionGroupId = null,
}: UseCaptionsFlowParams) {
  const [selectedLanguage, setSelectedLanguage] =
    useState<TranscriptionLanguage>("en");
  const [captionPosition, setCaptionPosition] =
    useState<CaptionPosition>("bottom");
  const [isGeneratingCaptions, setIsGeneratingCaptions] = useState(false);
  const [captionStatus, setCaptionStatus] = useState("");
  const [captionProgress, setCaptionProgress] = useState(0);
  const [activeCaptionGroupId, setActiveCaptionGroupId] = useState<string | null>(
    null
  );

  const captionGroupIds = getCaptionGroupIds();
  const resolvedCaptionGroupId =
    activeCaptionGroupId || captionGroupIds[captionGroupIds.length - 1] || null;
  const captionElements = resolvedCaptionGroupId
    ? getCaptionElements(resolvedCaptionGroupId)
    : [];
  const totalCaptionCount = getCaptionElements().length;
  const hasCaptions = totalCaptionCount > 0;

  const captionReadinessLabel = hasCaptions
    ? `${totalCaptionCount} caption${totalCaptionCount === 1 ? "" : "s"} ready`
    : "No captions yet";

  const captionGroupMeta = useMemo(() => {
    return captionGroupIds.map((groupId) => {
      const elements = getCaptionElements(groupId);
      const first = elements[0];
      const generatedAt = first?.captionGeneratedAt
        ? new Date(first.captionGeneratedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : null;
      return {
        groupId,
        count: elements.length,
        source: first?.captionSource || "timeline",
        generatedAt,
      };
    });
  }, [captionGroupIds, getCaptionElements]);

  useEffect(() => {
    if (!preferredCaptionGroupId) return;
    setActiveCaptionGroupId(preferredCaptionGroupId);
  }, [preferredCaptionGroupId]);

  const generateCaptions = useCallback(async (): Promise<CaptionGenerationResult> => {
    setIsGeneratingCaptions(true);
    setCaptionStatus("Preparing audio...");
    setCaptionProgress(0);

    try {
      const result = await generateCaptionsFromTimeline(tracks, mediaItems, {
        addTextElement,
        language: selectedLanguage,
        position: captionPosition,
        cancelPrevious: true,
        onProgress: (info) => {
          if (typeof info.progress === "number") {
            setCaptionProgress(Math.round(info.progress));
          }
          setCaptionStatus(info.status || "Transcribing...");
        },
      });

      setActiveCaptionGroupId(result.groupId);
      setCaptionStatus("Done");
      setCaptionProgress(100);
      return result;
    } catch (error) {
      setCaptionStatus("");
      throw error;
    } finally {
      setIsGeneratingCaptions(false);
    }
  }, [tracks, mediaItems, addTextElement, selectedLanguage, captionPosition]);

  const clearResolvedCaptionGroup = useCallback(() => {
    if (!resolvedCaptionGroupId) return;
    deleteCaptionGroup(resolvedCaptionGroupId);
    setActiveCaptionGroupId(null);
    setCaptionStatus("");
    setCaptionProgress(0);
  }, [resolvedCaptionGroupId, deleteCaptionGroup]);

  const toggleCaptionPosition = useCallback(
    (position: CaptionPosition) => {
      setCaptionPosition(position);
      if (!resolvedCaptionGroupId) return;
      updateCaptionGroup(resolvedCaptionGroupId, {
        y: CAPTION_POSITION_Y[position],
      });
    },
    [resolvedCaptionGroupId, updateCaptionGroup]
  );

  const applyStyleToResolvedGroup = useCallback(
    (updates: Partial<TextElement>) => {
      if (!resolvedCaptionGroupId) return false;
      const ids = getCaptionElements(resolvedCaptionGroupId).map((item) => item.id);
      updateCaptionGroupStyle(ids, updates, updateTextElement);
      return true;
    },
    [resolvedCaptionGroupId, getCaptionElements, updateTextElement]
  );

  return {
    selectedLanguage,
    setSelectedLanguage,
    captionPosition,
    setCaptionPosition,
    isGeneratingCaptions,
    captionStatus,
    captionProgress,
    activeCaptionGroupId,
    setActiveCaptionGroupId,
    captionGroupIds,
    captionGroupMeta,
    resolvedCaptionGroupId,
    captionElements,
    totalCaptionCount,
    hasCaptions,
    captionReadinessLabel,
    generateCaptions,
    clearResolvedCaptionGroup,
    toggleCaptionPosition,
    applyStyleToResolvedGroup,
  };
}
