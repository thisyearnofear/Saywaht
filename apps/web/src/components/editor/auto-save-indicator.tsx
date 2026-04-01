"use client";

import { useAutoSave } from "@/hooks/use-auto-save";
import { CheckCircle, Cloud, AlertCircle } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface AutoSaveIndicatorProps {
  className?: string;
}

export function AutoSaveIndicator({ className }: AutoSaveIndicatorProps) {
  const { formattedTimeAgo, isSaving, saveError } = useAutoSave();

  // Don't show if no save happened yet
  if (!formattedTimeAgo && !isSaving) return null;

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      {isSaving ? (
        <>
          <Cloud className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span className="text-amber-600">Saving...</span>
        </>
      ) : saveError ? (
        <>
          <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          <span className="text-red-500">Save failed</span>
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span>Saved {formattedTimeAgo}</span>
        </>
      )}
    </div>
  );
}