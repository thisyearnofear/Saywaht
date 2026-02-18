"use client";

import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTemplateStore } from "@/stores/template-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/header";
import { ArrowLeft, Layers, Sparkles, Mic } from "@/lib/icons";

interface TemplateUseClientProps {
  id: string;
}

export default function TemplateUseClient({ id }: TemplateUseClientProps) {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const {
    selectedTemplate,
    isLoading,
    error,
    selectTemplate,
    applySelectedTemplate,
    clearSelectedTemplate,
  } = useTemplateStore();

  useEffect(() => {
    if (id) {
      selectTemplate(id);
    }
  }, [id, selectTemplate]);

  useEffect(() => {
    if (selectedTemplate) {
      setProjectName(selectedTemplate.name);
    }
  }, [selectedTemplate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 container max-w-6xl mx-auto py-8 px-4 overflow-y-auto">
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 container max-w-6xl mx-auto py-8 px-4 overflow-y-auto">
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            <h3 className="font-semibold mb-2">Error loading template</h3>
            <p>{error}</p>
            <Button onClick={() => selectTemplate(id)} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedTemplate) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 container max-w-6xl mx-auto py-8 px-4 overflow-y-auto">
          <div className="p-8 text-center glass rounded-2xl">
            <h3 className="text-xl font-bold mb-2">Template Not Found</h3>
            <p className="text-muted-foreground">The requested template could not be found.</p>
            <Button onClick={() => router.push("/templates")} variant="secondary" className="mt-4 rounded-full">
              Back to Templates
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;
    // Await the full async template load (media fetching + track creation)
    // before navigating, so the editor doesn't race with the background task.
    const success = await applySelectedTemplate(projectName || selectedTemplate.name);
    if (success) {
      // Clear the selected template BEFORE navigating so that EditorProvider
      // does not attempt a second (duplicate) application of the same template.
      clearSelectedTemplate();
      router.push("/editor");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 container max-w-6xl mx-auto py-4 md:py-8 px-4 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => router.push(`/templates/${selectedTemplate.id}`)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Details
            </Button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Use Template
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure your project settings
              </p>
            </div>
          </div>

          {/* Template Preview Card */}
          <div className="glass rounded-3xl p-6 border-border/40">
            <div className="flex gap-4 items-start">
              <div className="w-32 h-20 relative flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                {selectedTemplate.thumbnailUrl ? (
                  <Image
                    src={selectedTemplate.thumbnailUrl}
                    alt={selectedTemplate.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Layers className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold">{selectedTemplate.name}</h2>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {selectedTemplate.description}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {selectedTemplate.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Project Name Input */}
          <div className="space-y-4">
            <label htmlFor="project-name" className="text-sm font-medium">
              Project Name
            </label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setProjectName(e.target.value)}
              placeholder="Enter a name for your project"
            />
          </div>

          {/* Template Contents */}
          <div className="glass rounded-3xl p-6 border-border/40">
            <h3 className="text-sm uppercase tracking-widest font-bold mb-4 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Template Contents
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Layers className="h-3 w-3 text-primary" />
                </div>
                <span>{selectedTemplate.mediaItems?.length || 0} media items</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-primary" />
                </div>
                <span>{selectedTemplate.timelineTracks?.length || 0} timeline tracks</span>
              </li>
              <li className="flex items-center gap-3 text-sm">
                <div className={`h-6 w-6 rounded-full flex items-center justify-center ${selectedTemplate.hasAudio ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
                  <Mic className={`h-3 w-3 ${selectedTemplate.hasAudio ? 'text-green-500' : 'text-yellow-500'}`} />
                </div>
                <span>{selectedTemplate.hasAudio ? 'Includes audio' : 'Add your own voiceover'}</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={handleApplyTemplate}
              disabled={isLoading}
              className="flex-1 rounded-full h-12 text-lg font-bold"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Creating…
                </span>
              ) : (
                "Create Project"
              )}
            </Button>
            <Button variant="outline" onClick={() => router.push("/templates")} className="rounded-full">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
