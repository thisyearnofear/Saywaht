"use client";

import { useState, useEffect } from "@/lib/hooks-provider";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/stores/template-store";
import { Button } from "@/components/ui/button";
import { InspirationExample } from "@/types/template";

interface InspirationPageClientProps {
  id: string;
}

export default function InspirationPageClient({
  id,
}: InspirationPageClientProps) {
  const router = useRouter();
  const { categories, isLoading, error, fetchCategories } = useTemplateStore();
  const [inspirationExamples, setInspirationExamples] = useState<
    InspirationExample[]
  >([]);
  const [categoryName, setCategoryName] = useState<string>("");

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (categories && categories.length > 0 && id) {
      // Find the template category
      let templateCategory = null;
      let templateData = null;

      for (const category of categories) {
        const template = category.templates.find((t) => t.id === id);
        if (template) {
          templateCategory = category;
          templateData = template;
          break;
        }
      }

      if (templateCategory && templateCategory.inspiration) {
        setInspirationExamples(templateCategory.inspiration.examples || []);
        setCategoryName(templateCategory.name);
      }
    }
  }, [categories, id]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 animate-spin text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/20 text-red-100 rounded-lg">
        <h3 className="font-semibold mb-2">Error loading inspiration</h3>
        <p>{error}</p>
        <Button
          onClick={() => fetchCategories()}
          variant="outline"
          className="mt-4 bg-white/10 text-white hover:bg-white/20"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-8">
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:text-white"
          onClick={() => router.push(`/templates/${id}`)}
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
          Inspiration Gallery
        </h1>
      </div>

      <div className="mb-8">
        <p className="text-white/80 text-lg">
          Check out these examples of {categoryName.toLowerCase()} to inspire
          your creativity.
        </p>
      </div>

      {inspirationExamples.length === 0 ? (
        <div className="p-8 text-center bg-white/5 rounded-lg">
          <h3 className="text-xl font-medium mb-2 text-white/80">
            No inspiration examples available
          </h3>
          <p className="text-white/60 mb-4">
            There are no examples available for this template category yet.
          </p>
          <Button
            onClick={() => router.push(`/templates/${id}`)}
            variant="outline"
            className="bg-white/10 text-white hover:bg-white/20"
          >
            Back to Template
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {inspirationExamples.map((example: InspirationExample) => (
            <div
              key={example.id}
              className="bg-white/5 rounded-lg overflow-hidden"
            >
              <div className="aspect-video w-full relative">
                {example.embedType === "youtube" && (
                  <iframe
                    src={`https://www.youtube.com/embed/${getYouTubeId(example.url)}`}
                    title={example.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                )}

                {!example.embedType && example.thumbnailUrl && (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${example.thumbnailUrl})` }}
                  >
                    <a
                      href={example.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      <svg
                        width="64"
                        height="64"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-white"
                      >
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </a>
                  </div>
                )}
              </div>

              <div className="p-4">
                <h3 className="text-lg font-medium text-white mb-2">
                  {example.title}
                </h3>
                {example.description && (
                  <p className="text-white/80 text-sm mb-3">
                    {example.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/60">
                    Source: {example.source}
                  </span>
                  <a
                    href={example.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-sm hover:underline"
                  >
                    View Original
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 flex justify-center">
        <Button
          onClick={() => router.push(`/templates/${id}`)}
          variant="outline"
          className="bg-white/10 text-white hover:bg-white/20"
        >
          Back to Template
        </Button>
      </div>
    </div>
  );
}

// Helper function to extract YouTube video ID from URL
function getYouTubeId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : "";
}
