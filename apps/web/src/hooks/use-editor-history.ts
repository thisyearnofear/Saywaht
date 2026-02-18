import { useCallback } from "react";
import { useHistoryStore } from "@/stores/history-store";
import { useTimelineStore } from "@/stores/timeline-store";
import { useTextStore } from "@/stores/text-store";
import { toast } from "sonner";

export function useEditorHistory() {
  const { pushState, undo: undoHistory, redo: redoHistory, canUndo, canRedo } = useHistoryStore();
  const { tracks, setTracks } = useTimelineStore();
  const { textElements, setTextElements } = useTextStore();

  const saveState = useCallback(() => {
    pushState({
      tracks: JSON.parse(JSON.stringify(tracks)),
      textElements: JSON.parse(JSON.stringify(textElements)),
    });
  }, [tracks, textElements, pushState]);

  const undo = useCallback(() => {
    const prevState = undoHistory();
    if (prevState) {
      setTracks(prevState.tracks);
      setTextElements(prevState.textElements);
      toast.success("Undo successful");
    }
  }, [undoHistory, setTracks, setTextElements]);

  const redo = useCallback(() => {
    const nextState = redoHistory();
    if (nextState) {
      setTracks(nextState.tracks);
      setTextElements(nextState.textElements);
      toast.success("Redo successful");
    }
  }, [redoHistory, setTracks, setTextElements]);

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
