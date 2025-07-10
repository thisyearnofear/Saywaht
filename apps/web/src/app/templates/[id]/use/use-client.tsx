"use client";

import { useState, useEffect, ChangeEvent } from "@/lib/hooks-provider";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTemplateStore } from "@/stores/template-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  } = useTemplateStore();

  useEffect(() => {
    if (id) {
      selectTemplate(id);
    }
  }, [id, selectTemplate]);

  // Set default project name when template loads
  useEffect(() => {
    if (selectedTemplate) {
      setProjectName(selectedTemplate.name);
    }
  }, [selectedTemplate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <svg
            className="w-8 h-8 animate-spin text-white"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="p-4 bg-red-500/20 text-red-100 rounded-lg">
          <h3 className="font-semibold mb-2">Error loading template</h3>
          <p>{error}</p>
          <Button
            onClick={() => selectTemplate(id)}
            variant="outline"
            className="mt-4 bg-white/10 text-white hover:bg-white/20"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // Template not found
  if (!selectedTemplate) {
    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="p-8 text-center text-white/80">
          <h3 className="text-xl font-medium mb-2">Template Not Found</h3>
          <p>The requested template could not be found.</p>
          <Button
            onClick={() => router.push("/templates")}
            variant="outline"
            className="mt-4 bg-white/10 text-white hover:bg-white/20"
          >
            Back to Templates
          </Button>
        </div>
      </div>
    );
  }

  const handleApplyTemplate = () => {
    applySelectedTemplate(projectName || selectedTemplate.name);
    router.push("/editor");
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Use Template</h1>
            <p className="text-white/70 mt-1">
              Configure your project settings
            </p>
          </div>
          <Button
            variant="ghost"
            className="text-white/70 hover:text-white"
            onClick={() => router.push(`/templates/${selectedTemplate.id}`)}
          >
            Back to Details
          </Button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
          <div className="flex gap-4 items-start">
            <div className="w-32 h-20 relative flex-shrink-0 overflow-hidden rounded-md bg-gray-900">
              {selectedTemplate.thumbnailUrl ? (
                <Image
                  src={selectedTemplate.thumbnailUrl}
                  alt={selectedTemplate.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg
                    width="32"
                    height="32"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-white/50"
                  >
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              )}
            </div>

            <div>
              <h2 className="text-xl font-semibold text-white">
                {selectedTemplate.name}
              </h2>
              <p className="text-white/70 text-sm mt-1">
                {selectedTemplate.description}
              </p>

              <div className="flex gap-2 mt-2">
                {selectedTemplate.tags &&
                  selectedTemplate.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-white/10 text-white/80 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label
              htmlFor="project-name"
              className="block text-sm font-medium text-white mb-2"
            >
              Project Name
            </label>
            <Input
              id="project-name"
              value={projectName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setProjectName(e.target.value)
              }
              placeholder="Enter a name for your project"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div className="pt-4 border-t border-white/10">
            <h3 className="text-white font-medium mb-2">Template Contents</h3>
            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-green-400"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>
                  {selectedTemplate.mediaItems?.length || 0} media items
                </span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-green-400"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>
                  {selectedTemplate.timelineTracks?.length || 0} timeline tracks
                </span>
              </li>
              <li className="flex items-center gap-2">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={
                    selectedTemplate.hasAudio
                      ? "text-green-400"
                      : "text-yellow-400"
                  }
                >
                  {selectedTemplate.hasAudio ? (
                    <polyline points="20 6 9 17 4 12"></polyline>
                  ) : (
                    <circle cx="12" cy="12" r="10"></circle>
                  )}
                </svg>
                <span>
                  {selectedTemplate.hasAudio
                    ? "Includes audio"
                    : "No audio (add your own voiceover)"}
                </span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4 pt-6">
            <Button
              onClick={handleApplyTemplate}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Create Project
            </Button>

            <Button
              variant="outline"
              className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
              onClick={() => router.push("/templates")}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
