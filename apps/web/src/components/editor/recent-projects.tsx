"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Play, MoreHorizontal, Trash2, LayoutGrid } from "@/lib/icons";
import { formatRelativeTime } from "@/hooks/use-celebrations";
import { cn } from "@/lib/utils";

interface RecentProject {
  id: string;
  name: string;
  updatedAt: number;
  thumbnail?: string;
  duration?: number;
}

interface RecentProjectsProps {
  projects: RecentProject[];
  onSelectProject: (project: RecentProject) => void;
  onDeleteProject?: (projectId: string) => void;
  onCreateNew?: () => void;
}

export function RecentProjects({
  projects,
  onSelectProject,
  onDeleteProject,
  onCreateNew,
}: RecentProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Recent Projects
        </h3>
        {onCreateNew && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCreateNew}
            className="text-white/60 hover:text-white text-xs"
          >
            New Project
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.slice(0, 3).map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className="bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer group overflow-hidden"
              onClick={() => onSelectProject(project)}
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-gradient-to-br from-indigo-500/30 to-purple-500/30 relative overflow-hidden">
                {project.thumbnail ? (
                  <img
                    src={project.thumbnail}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <LayoutGrid className="w-12 h-12 text-white/20" />
                  </div>
                )}
                
                {/* Duration badge */}
                {project.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                    {Math.floor(project.duration / 60)}:{(project.duration % 60).toString().padStart(2, "0")}
                  </div>
                )}

                {/* Play overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-5 h-5 text-white ml-1" />
                  </div>
                </div>
              </div>

              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white text-sm truncate">
                      {project.name}
                    </h4>
                    <p className="text-white/50 text-xs flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(project.updatedAt)}
                    </p>
                  </div>
                  
                  {onDeleteProject && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Mobile swipeable version
export function RecentProjectsMobile({
  projects,
  onSelectProject,
  onDeleteProject,
}: RecentProjectsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (projects.length === 0) return null;

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "left" && currentIndex < projects.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else if (direction === "right" && currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  return (
    <div className="w-full space-y-4">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Recent Projects
      </h3>

      <div className="relative overflow-hidden">
        <div className="flex gap-4 transition-transform duration-300 ease-out">
          {projects.slice(0, 3).map((project, index) => (
            <div
              key={project.id}
              className={cn(
                "flex-shrink-0 w-[280px] transition-all duration-300",
                index === currentIndex ? "opacity-100" : "opacity-0 absolute"
              )}
              style={{
                transform: `translateX(${(index - currentIndex) * 100}%)`,
              }}
            >
              <Card
                className="bg-white/5 border-white/10 hover:bg-white/10 transition-all cursor-pointer"
                onClick={() => onSelectProject(project)}
              >
                <div className="aspect-video bg-gradient-to-br from-indigo-500/30 to-purple-500/30 relative">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <LayoutGrid className="w-12 h-12 text-white/20" />
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h4 className="font-semibold text-white text-sm truncate">
                    {project.name}
                  </h4>
                  <p className="text-white/50 text-xs flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(project.updatedAt)}
                  </p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Pagination dots */}
        <div className="flex justify-center gap-2 mt-4">
          {projects.slice(0, 3).map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/30"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}