"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/hooks/use-celebrations";
import { Clock, ArrowRight, Film } from "@/lib/icons";

interface RecentProject {
  id: string;
  name: string;
  thumbnailUrl?: string;
  updatedAt: number;
}

export function RecentProjects() {
  const { preferences, addRecentProject } = useUserPreferencesStore();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    // In a real app, we'd fetch project details from the database
    // For now, we'll use the recent project IDs from preferences
    // and generate placeholder data
    const projects: RecentProject[] = preferences.recentProjects.slice(0, 3).map((id) => ({
      id,
      name: `Project ${id.slice(0, 8)}`,
      updatedAt: Date.now() - Math.random() * 3600000, // Random time within last hour
    }));

    setRecentProjects(projects);
  }, [preferences.recentProjects]);

  if (recentProjects.length === 0) {
    return null;
  }

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Recent Projects</h2>
        <Link href="/editor" className="text-sm text-muted-foreground hover:text-foreground">
          View all →
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentProjects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={`/editor?project=${project.id}`}>
              <div className="group relative aspect-video rounded-xl overflow-hidden bg-muted border hover:border-primary/50 transition-colors">
                {project.thumbnailUrl ? (
                  <img
                    src={project.thumbnailUrl}
                    alt={project.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Film className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-2 left-3 right-3">
                    <p className="text-sm font-medium text-white truncate">{project.name}</p>
                    <p className="text-xs text-white/70 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(project.updatedAt)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Button asChild size="lg" className="gap-2">
          <Link href="/editor">
            Continue editing
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

// Mobile-friendly swipeable version
export function RecentProjectsCarousel() {
  const { preferences } = useUserPreferencesStore();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    const projects: RecentProject[] = preferences.recentProjects.slice(0, 3).map((id) => ({
      id,
      name: `Project ${id.slice(0, 8)}`,
      updatedAt: Date.now() - Math.random() * 3600000,
    }));
    setRecentProjects(projects);
  }, [preferences.recentProjects]);

  if (recentProjects.length === 0) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
      {recentProjects.map((project) => (
        <Link
          key={project.id}
          href={`/editor?project=${project.id}`}
          className="flex-shrink-0 w-48 snap-center"
        >
          <div className="aspect-video rounded-lg overflow-hidden bg-muted border">
            {project.thumbnailUrl ? (
              <img
                src={project.thumbnailUrl}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
          </div>
          <p className="text-xs mt-1 truncate">{project.name}</p>
        </Link>
      ))}
    </div>
  );
}