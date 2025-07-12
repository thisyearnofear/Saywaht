"use client";

import React from "@/lib/hooks-provider";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useTemplateStore } from "@/stores/template-store";
import { Button } from "@/components/ui/button";
import { VideoPreview } from "./video-preview";
import { VideoThumbnailSimple } from "./video-thumbnail-simple";
import { useState, useEffect } from "@/lib/hooks-provider";

interface TemplateDetailsProps {
  templateId: string;
}

export function TemplateDetails({ templateId }: TemplateDetailsProps) {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  const {
    selectedTemplate,
    isLoading,
    error,
    selectTemplate,
    applySelectedTemplate,
  } = useTemplateStore();

  useEffect(() => {
    if (templateId) {
      selectTemplate(templateId);
    }
  }, [templateId, selectTemplate]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 animate-spin text-white">Loading...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-500/20 text-red-100 rounded-lg">
        <h3 className="font-semibold mb-2">Error loading template</h3>
        <p>{error}</p>
        <Button
          onClick={() => selectTemplate(templateId)}
          variant="outline"
          className="mt-4 bg-white/10 text-white hover:bg-white/20"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Template not found
  if (!selectedTemplate) {
    return (
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
    );
  }

  const handleApplyTemplate = () => {
    applySelectedTemplate();
    router.push("/editor");
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    // In a real implementation, this would control video playback
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:text-white"
          onClick={() => router.push("/templates")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
        </Button>
        <h1 className="text-2xl font-semibold text-white">
          {selectedTemplate.name}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Preview section - adaptive aspect ratio */}
          <div
            className={`relative overflow-hidden rounded-lg bg-black ${
              selectedTemplate.aspectRatio === "portrait"
                ? "aspect-[9/16] max-w-md mx-auto"
                : selectedTemplate.aspectRatio === "square"
                  ? "aspect-square max-w-md mx-auto"
                  : "aspect-video"
            }`}
          >
            {selectedTemplate.videoUrl ||
            (selectedTemplate.thumbnailUrl &&
              selectedTemplate.thumbnailUrl.endsWith(".mp4")) ? (
              // Use VideoPreview for playback when video is available
              <VideoPreview
                src={selectedTemplate.videoUrl || selectedTemplate.thumbnailUrl}
                title={selectedTemplate.name}
              />
            ) : selectedTemplate.thumbnailUrl ? (
              // Regular image thumbnail
              <Image
                src={selectedTemplate.thumbnailUrl}
                alt={selectedTemplate.name}
                fill
                className="object-cover"
              />
            ) : (
              // Fallback when no media is available
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <svg
                  width="64"
                  height="64"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-white/50"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            )}
          </div>

          {/* Mobile-first: Quick context */}
          <div className="lg:hidden p-4 bg-white/5 rounded-lg">
            <p className="text-white/80 text-sm mb-3">
              {selectedTemplate.description}
            </p>

            {/* Simple next step hint */}
            <div className="flex items-center gap-2 text-xs text-blue-300">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              <span>Record your voice, sync to video, export & share</span>
            </div>
          </div>

          {/* Mobile-first: Quick action button */}
          <div className="lg:hidden">
            <Button
              onClick={handleApplyTemplate}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 text-lg font-semibold"
            >
              Start Creating with This Template
            </Button>
          </div>

          {/* Timeline preview */}
          {selectedTemplate.timelineTracks && (
            <div className="p-4 bg-white/5 rounded-lg">
              <h3 className="text-md font-medium text-white mb-4">
                Timeline Preview
              </h3>
              <div className="space-y-2">
                {selectedTemplate.timelineTracks.map((track) => (
                  <div key={track.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-white/80">
                        {track.name ||
                          `${track.type.charAt(0).toUpperCase() + track.type.slice(1)} Track`}
                      </span>
                      {track.muted && (
                        <span className="text-xs bg-yellow-600/30 text-yellow-200 px-1.5 py-0.5 rounded">
                          Muted
                        </span>
                      )}
                    </div>

                    <div className="relative h-8 bg-white/5 rounded-sm overflow-hidden">
                      {track.clips.map((clip) => {
                        // Calculate clip position and width based on timeline (100% = 60 seconds)
                        const startPercent = (clip.startTime / 60) * 100;
                        const widthPercent = (clip.duration / 60) * 100;

                        // Different background colors for different track types
                        const bgColor =
                          track.type === "video"
                            ? "bg-blue-500/50"
                            : track.type === "audio"
                              ? "bg-green-500/50"
                              : "bg-purple-500/50"; // effects

                        return (
                          <div
                            key={clip.id}
                            className={`absolute top-0 h-full ${bgColor} border border-white/20 rounded-sm`}
                            style={{
                              left: `${startPercent}%`,
                              width: `${widthPercent}%`,
                            }}
                          >
                            <div className="px-2 truncate text-xs text-white/90 leading-8">
                              {clip.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Quick guide - desktop version */}
          <div className="hidden lg:block p-4 bg-white/5 rounded-lg">
            <h3 className="text-md font-medium text-white mb-2 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-blue-400"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
              Quick Start
            </h3>
            <p className="text-white/70 text-sm">
              Record your voice, sync to video, export & share
            </p>
          </div>

          {/* Template info */}
          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="text-md font-medium text-white mb-2">
              About this template
            </h3>
            <p className="text-white/80">{selectedTemplate.description}</p>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-white/60">Has Audio</div>
                <div className="text-white">
                  {selectedTemplate.hasAudio ? "Yes" : "No"}
                </div>

                <div className="text-white/60">Category</div>
                <div className="text-white">{selectedTemplate.category}</div>

                <div className="text-white/60">Tags</div>
                <div className="text-white">
                  {selectedTemplate.tags && selectedTemplate.tags.length > 0
                    ? selectedTemplate.tags.join(", ")
                    : "None"}
                </div>

                {selectedTemplate.source && (
                  <>
                    <div className="text-white/60">Source</div>
                    <div className="text-white">
                      {selectedTemplate.source.url ? (
                        <a
                          href={selectedTemplate.source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {selectedTemplate.source.name}
                          {selectedTemplate.source.author &&
                            ` (${selectedTemplate.source.author})`}
                        </a>
                      ) : (
                        <span>
                          {selectedTemplate.source.name}
                          {selectedTemplate.source.author &&
                            ` (${selectedTemplate.source.author})`}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Media items */}
          {selectedTemplate.mediaItems &&
            selectedTemplate.mediaItems.length > 0 && (
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="text-md font-medium text-white mb-4">
                  Included Media
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedTemplate.mediaItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white/5 border border-white/10 rounded-md p-3"
                    >
                      <div className="flex items-center gap-3">
                        {/* Media type icon */}
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded bg-white/10">
                          {item.type === "video" && (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-blue-400"
                            >
                              <rect
                                x="2"
                                y="2"
                                width="20"
                                height="20"
                                rx="2.18"
                                ry="2.18"
                              />
                              <line x1="7" y1="2" x2="7" y2="22" />
                              <line x1="17" y1="2" x2="17" y2="22" />
                              <line x1="2" y1="12" x2="22" y2="12" />
                            </svg>
                          )}
                          {item.type === "image" && (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-green-400"
                            >
                              <rect
                                x="3"
                                y="3"
                                width="18"
                                height="18"
                                rx="2"
                                ry="2"
                              />
                              <circle cx="8.5" cy="8.5" r="1.5" />
                              <polyline points="21 15 16 10 5 21" />
                            </svg>
                          )}
                          {item.type === "audio" && (
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              className="text-purple-400"
                            >
                              <path d="M9 18V5l12-2v13" />
                              <circle cx="6" cy="18" r="3" />
                              <circle cx="18" cy="16" r="3" />
                            </svg>
                          )}
                        </div>

                        {/* Media info */}
                        <div className="flex-grow min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-white/60">
                            {item.duration
                              ? `${Math.round(item.duration)}s`
                              : ""}
                            {item.duration && item.aspectRatio ? " • " : ""}
                            {item.aspectRatio ? `${item.aspectRatio}:1` : ""}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleApplyTemplate}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white hidden lg:flex"
            >
              Use This Template
            </Button>

            <Button
              variant="outline"
              className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
              onClick={() => router.push("/templates")}
            >
              Back to Browse
            </Button>
          </div>

          {/* Inspiration Section */}
          {templateId && (
            <div className="mt-6">
              <button
                onClick={() =>
                  router.push(`/templates/${templateId}/inspiration`)
                }
                className="text-sm text-blue-400 hover:underline"
              >
                View Similar Examples
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
