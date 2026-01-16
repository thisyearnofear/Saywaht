"use client";

import { useState } from "react";
import { useSceneStore } from "@/stores/scene-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
} from "@/lib/icons";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Scenes View - Mobile-first scene switcher
 * 
 * Following Core Principles:
 * - Mobile-first: Bottom sheet, touch-optimized
 * - Minimal: Essential features only
 * - Clean: Clear UI hierarchy
 */

export function ScenesView({ children }: { children: React.ReactNode }) {
  const { scenes, currentScene, createScene, deleteScene, renameScene, switchToScene } =
    useSceneStore();
  const [isOpen, setIsOpen] = useState(false);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleCreateScene = () => {
    const sceneNumber = scenes.length + 1;
    const newSceneName = `Scene ${sceneNumber}`;
    const sceneId = createScene(newSceneName);
    toast.success(`Created ${newSceneName}`);
  };

  const handleDeleteScene = (sceneId: string, sceneName: string) => {
    try {
      deleteScene(sceneId);
      toast.success(`Deleted ${sceneName}`);
    } catch (error) {
      toast.error("Cannot delete main scene");
    }
  };

  const handleSwitchScene = (sceneId: string, sceneName: string) => {
    switchToScene(sceneId);
    setIsOpen(false);
    toast.success(`Switched to ${sceneName}`);
  };

  const startRename = (sceneId: string, currentName: string) => {
    setEditingSceneId(sceneId);
    setEditingName(currentName);
  };

  const cancelRename = () => {
    setEditingSceneId(null);
    setEditingName("");
  };

  const confirmRename = (sceneId: string) => {
    if (editingName.trim()) {
      renameScene(sceneId, editingName.trim());
      toast.success("Scene renamed");
    }
    cancelRename();
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh] max-h-[600px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Scenes
          </SheetTitle>
          <SheetDescription>
            Organize your video into multiple scenes
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Create Scene Button */}
          <Button
            onClick={handleCreateScene}
            className="w-full"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Scene
          </Button>

          {/* Scenes List */}
          <div className="space-y-2 overflow-y-auto max-h-[calc(70vh-200px)]">
            {scenes.map((scene) => {
              const isActive = currentScene?.id === scene.id;
              const isEditing = editingSceneId === scene.id;

              return (
                <div
                  key={scene.id}
                  className={cn(
                    "group relative p-4 rounded-lg border transition-all",
                    isActive
                      ? "bg-accent border-accent-foreground/20"
                      : "bg-card hover:bg-accent/50 border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {/* Scene Indicator */}
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        isActive ? "bg-primary" : "bg-muted-foreground"
                      )}
                    />

                    {/* Scene Name */}
                    {isEditing ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") confirmRename(scene.id);
                          if (e.key === "Escape") cancelRename();
                        }}
                        className="flex-1 h-8"
                        autoFocus
                      />
                    ) : (
                      <button
                        onClick={() => handleSwitchScene(scene.id, scene.name)}
                        className="flex-1 text-left font-medium"
                      >
                        {scene.name}
                        {scene.isMain && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Main)
                          </span>
                        )}
                      </button>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {isEditing ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => confirmRename(scene.id)}
                          >
                            <Check className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={cancelRename}
                          >
                            <X className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => startRename(scene.id, scene.name)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {!scene.isMain && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() =>
                                handleDeleteScene(scene.id, scene.name)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <Check className="h-5 w-5 text-primary" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {scenes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No scenes yet</p>
              <p className="text-xs mt-1">Create a scene to get started</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
