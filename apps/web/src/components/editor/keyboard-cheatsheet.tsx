"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Zap, Info } from "@/lib/icons";

// Keyboard shortcuts definition
const keyboardShortcuts = [
  {
    category: "Playback",
    items: [
      { key: "Space", description: "Play / Pause" },
      { key: "←", description: "Previous frame" },
      { key: "→", description: "Next frame" },
      { key: "J", description: "Rewind" },
      { key: "K", description: "Pause" },
      { key: "L", description: "Fast forward" },
    ],
  },
  {
    category: "Editing",
    items: [
      { key: "Delete", description: "Remove selected clip" },
      { key: "Ctrl+Z", description: "Undo" },
      { key: "Ctrl+Shift+Z", description: "Redo" },
      { key: "Ctrl+C", description: "Copy clip" },
      { key: "Ctrl+V", description: "Paste clip" },
      { key: "I", description: "Set in point" },
      { key: "O", description: "Set out point" },
    ],
  },
  {
    category: "Timeline",
    items: [
      { key: "S", description: "Toggle snap to grid" },
      { key: "+", description: "Zoom in" },
      { key: "-", description: "Zoom out" },
      { key: "Home", description: "Go to start" },
      { key: "End", description: "Go to end" },
    ],
  },
  {
    category: "Advanced",
    items: [
      { key: "E", description: "Separate audio" },
      { key: "Shift+R", description: "Reverse clip" },
      { key: "Ctrl+E", description: "Export video" },
      { key: "Ctrl+S", description: "Save project" },
    ],
  },
];

// Mobile gestures
const mobileGestures = [
  { gesture: "Pinch", description: "Zoom timeline" },
  { gesture: "Swipe left/right", description: "Move playhead" },
  { gesture: "Two-finger tap", description: "Undo" },
  { gesture: "Long press", description: "Select clip" },
  { gesture: "Drag clip", description: "Reorder in timeline" },
];

interface KeyboardCheatsheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardCheatsheet({ isOpen, onClose }: KeyboardCheatsheetProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
            <Badge variant="secondary" className="gap-1">
              <Zap className="w-3 h-3" />
              Pro
            </Badge>
          </div>
          <Button variant="text" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {keyboardShortcuts.map((category) => (
            <div key={category.category}>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">
                {category.category}
              </h3>
              <div className="space-y-1">
                {category.items.map((shortcut) => (
                  <div
                    key={shortcut.key}
                    className="flex items-center justify-between py-1"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <kbd className="px-2 py-0.5 text-xs font-mono bg-muted border rounded">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Mobile gestures section */}
        <div className="mt-6 pt-6 border-t">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            📱 Mobile Gestures
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {mobileGestures.map((gesture) => (
              <div
                key={gesture.gesture}
                className="flex flex-col p-2 bg-muted/50 rounded-lg"
              >
                <span className="text-xs font-medium">{gesture.gesture}</span>
                <span className="text-xs text-muted-foreground">
                  {gesture.description}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs text-center text-muted-foreground">
          Press <kbd className="px-1 bg-muted rounded">?</kbd> to toggle this cheatsheet
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage keyboard shortcut visibility
export function useKeyboardShortcuts() {
  const [isCheatsheetOpen, setIsCheatsheetOpen] = useState(false);

  const openCheatsheet = useCallback(() => setIsCheatsheetOpen(true), []);
  const closeCheatsheet = useCallback(() => setIsCheatsheetOpen(false), []);
  const toggleCheatsheet = useCallback(
    () => setIsCheatsheetOpen((prev) => !prev),
    []
  );

  // Listen for ? key press globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Toggle cheatsheet on ? key
      if (e.key === "?" || (e.key === "/" && e.shiftKey)) {
        e.preventDefault();
        toggleCheatsheet();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleCheatsheet]);

  return {
    isCheatsheetOpen,
    openCheatsheet,
    closeCheatsheet,
    toggleCheatsheet,
  };
}

// Standalone component that provides the cheatsheet with keyboard support
export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const { isCheatsheetOpen, toggleCheatsheet, closeCheatsheet } = useKeyboardShortcuts();

  return (
    <>
      {children}
      <KeyboardCheatsheet isOpen={isCheatsheetOpen} onClose={closeCheatsheet} />
    </>
  );
}