"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Zap, Info, Monitor } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface Shortcut {
  keys: string[];
  description: string;
  category: "playback" | "editing" | "navigation" | "pro";
  isPro?: boolean;
}

const shortcuts: Shortcut[] = [
  // Playback
  { keys: ["Space"], description: "Play / Pause", category: "playback" },
  { keys: ["M"], description: "Toggle mute", category: "playback" },
  { keys: ["←"], description: "Seek backward 1s", category: "playback" },
  { keys: ["→"], description: "Seek forward 1s", category: "playback" },
  { keys: ["Shift", "←"], description: "Seek backward 5s", category: "playback" },
  { keys: ["Shift", "→"], description: "Seek forward 5s", category: "playback" },
  { keys: ["Home"], description: "Go to start", category: "playback" },
  { keys: ["End"], description: "Go to end", category: "playback" },
  
  // Editing
  { keys: ["Ctrl", "Z"], description: "Undo", category: "editing" },
  { keys: ["Shift", "Ctrl", "Z"], description: "Redo", category: "editing" },
  { keys: ["Delete"], description: "Remove selected clip", category: "editing" },
  { keys: ["Ctrl", "C"], description: "Copy clip", category: "editing" },
  { keys: ["Ctrl", "V"], description: "Paste clip", category: "editing" },
  { keys: ["Ctrl", "D"], description: "Duplicate clip", category: "editing" },
  
  // Navigation
  { keys: ["T"], description: "Toggle timeline", category: "navigation" },
  { keys: ["F"], description: "Toggle fit/fill", category: "navigation" },
  { keys: ["Z"], description: "Reset zoom to 100%", category: "navigation" },
  { keys: ["+"], description: "Zoom in", category: "navigation" },
  { keys: ["-"], description: "Zoom out", category: "navigation" },
  
  // Pro tips
  { keys: ["?"], description: "Show this cheatsheet", category: "pro", isPro: true },
  { keys: ["S"], description: "Split clip at playhead", category: "pro", isPro: true },
  { keys: ["["], description: "Set in point", category: "pro", isPro: true },
  { keys: ["]"], description: "Set out point", category: "pro", isPro: true },
  { keys: ["I"], description: "Go to in point", category: "pro", isPro: true },
  { keys: ["O"], description: "Go to out point", category: "pro", isPro: true },
];

interface ShortcutsCheatsheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShortcutsCheatsheet({ isOpen, onClose }: ShortcutsCheatsheetProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all");

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const categories = [
    { id: "all", label: "All" },
    { id: "playback", label: "Playback" },
    { id: "editing", label: "Editing" },
    { id: "navigation", label: "Navigation" },
    { id: "pro", label: "Pro Tips", icon: Zap },
  ];

  const filteredShortcuts = activeCategory === "all"
    ? shortcuts
    : shortcuts.filter((s) => s.category === activeCategory);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-background border border-border rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">Keyboard Shortcuts</h2>
                    <p className="text-xs text-muted-foreground">Press ? to toggle</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Category tabs */}
              <div className="flex items-center gap-1 px-4 py-3 border-b overflow-x-auto">
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "rounded-xl text-xs font-medium whitespace-nowrap",
                      cat.icon && "gap-1"
                    )}
                  >
                    {cat.icon && <cat.icon className="w-3 h-3" />}
                    {cat.label}
                  </Button>
                ))}
              </div>

              {/* Shortcuts list */}
              <div className="p-4 overflow-y-auto max-h-[400px]">
                <div className="grid gap-2">
                  {filteredShortcuts.map((shortcut, index) => (
                    <motion.div
                      key={shortcut.description}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-xl",
                        shortcut.isPro && "bg-amber-500/5"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {shortcut.isPro && (
                          <Sparkles className="w-3 h-3 text-amber-500" />
                        )}
                        <span className="text-sm">{shortcut.description}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <span key={i}>
                            <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded-md border">
                              {key}
                            </kbd>
                            {i < shortcut.keys.length - 1 && (
                              <span className="text-muted-foreground mx-0.5">+</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Mobile gestures */}
              <div className="px-6 py-4 border-t bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                    Mobile Gestures
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👆</span>
                    <span>Tap to select</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✌️</span>
                    <span>Pinch to zoom</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">👉</span>
                    <span>Swipe to seek</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">✋</span>
                    <span>Long press to copy</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Hook to manage cheatsheet state
export function useShortcutsCheatsheet() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  return {
    isOpen,
    open,
    close,
    toggle,
    ShortcutsCheatsheet: () => <ShortcutsCheatsheet isOpen={isOpen} onClose={close} />,
  };
}