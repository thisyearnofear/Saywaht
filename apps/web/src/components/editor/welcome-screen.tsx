"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useProjectStore } from "@/stores/project-store";
import { useSmartNavigation } from "@/hooks/use-smart-navigation";
import { useState } from "react";
import { Sparkles, Video, Plus } from "@/lib/icons";
import { useIsMobile } from "@/hooks/use-mobile";

// Templates section removed - users can click "Explore All Packs" to visit templates page

export function WelcomeScreen() {
  const isMobile = useIsMobile();
  const { createNewProject } = useProjectStore();
  const { navigateToTemplate, navigateToTemplates } = useSmartNavigation();
  const [projectName, setProjectName] = useState("");
  const [showNameInput, setShowNameInput] = useState(false);

  // Don't auto-load templates - significantly improves editor init time
  // Users can still click "Explore All Packs" to browse templates
  const handleCreateProject = () => {
    if (showNameInput) {
      const name = projectName.trim() || "My Project";
      createNewProject(name);
    } else {
      setShowNameInput(true);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const name = projectName.trim() || "My Project";
      createNewProject(name);
    } else if (e.key === "Escape") {
      setShowNameInput(false);
      setProjectName("");
    }
  };

  return (
    <div className="h-full w-full bg-gradient-to-br from-indigo-900 via-purple-800 to-blue-900 text-white overflow-y-auto scrollable">
      {/* Hero Section with Visual Elements */}
      <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full blur-3xl"></div>
        <div className="absolute top-60 -left-20 w-60 h-60 bg-purple-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-60 h-60 bg-indigo-500 rounded-full blur-3xl"></div>
      </div>

      {/* Main Content */}
      <div className="relative h-full flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-4xl">
          {/* Header */}
          <div className="text-center mb-10">
            <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
              {" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                saywaht?!
              </span>
            </h1>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">
              Coin Your Commentary
            </p>
          </div>

          {/* Main Card */}
          <Card className="border-0 bg-white/10 backdrop-blur-md shadow-xl overflow-hidden">
            <div className="px-8 py-10">
              <div className="flex flex-col lg:flex-row-reverse gap-10">
                {/* Right Column - Templates (NOW PRIMARY) */}
                <div className="flex-1 space-y-6">
                  <div className="space-y-4 text-center lg:text-right">
                    <h2 className="text-3xl font-black flex items-center justify-center lg:justify-end gap-3 italic uppercase tracking-tighter">
                      <Sparkles className="h-8 w-8 text-yellow-400" />
                      Create with Style
                    </h2>
                    <p className="text-white/80 font-medium">Browse professionally designed templates.</p>
                  </div>

                  {/* Templates removed - click button to visit templates page */}

                  <div className="flex justify-center lg:justify-end pt-2">
                    <Button
                      onClick={() => navigateToTemplates()}
                      className="w-full h-16 bg-white text-blue-900 hover:bg-white/90 font-black uppercase tracking-widest rounded-2xl shadow-[0_20px_40px_rgba(255,255,255,0.1)] transition-all active:scale-95 text-lg"
                    >
                      Explore All Packs
                    </Button>
                  </div>
                </div>

                {/* Left Column - Project Creation (NOW SECONDARY) */}
                <div className="flex-1 space-y-6">
                  <div className="space-y-4 text-center lg:text-left">
                    <h2 className="text-2xl font-bold opacity-80">Starting Fresh?</h2>
                    <p className="text-white/60">
                      Create a project from scratch and import your own media.
                    </p>
                  </div>

                  {showNameInput ? (
                    <div className="flex flex-col gap-2">
                      <input
                        autoFocus
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        onKeyDown={handleNameKeyDown}
                        placeholder="Project name…"
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                      />
                      <Button
                        onClick={handleCreateProject}
                        className="w-full bg-white/20 hover:bg-white/30 text-white text-sm py-2 rounded-xl transition-all"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Project
                      </Button>
                    </div>
                  ) : isMobile ? (
                    <button
                      onClick={handleCreateProject}
                      className="text-white/50 text-sm underline underline-offset-2 hover:text-white/70 transition-colors"
                    >
                      New Empty Project
                    </button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleCreateProject}
                      className="w-full bg-white/5 border-white/20 hover:bg-white/10 text-white text-sm py-6 rounded-2xl transition-all"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      New Empty Project
                    </Button>
                  )}

                </div>
              </div>
            </div>

            {/* Bottom Feature Bar */}
            <div className="bg-white/5 px-8 py-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Pexels Templates</h3>
                    <p className="text-sm text-white/60">
                      Start with pre-made vids
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Custom Audio</h3>
                    <p className="text-sm text-white/60">
                      Add your own voiceovers (10s limit)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center text-pink-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="23 7 16 12 23 17 23 7" />
                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-white">
                      High Quality Video
                    </h3>
                    <p className="text-sm text-white/60">
                      Export in 4K resolution
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
