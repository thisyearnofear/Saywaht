"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/stores/template-store";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { InspirationExample } from "@/lib/types";
import { ArrowLeft, Sparkles } from "@/lib/icons";

interface InspirationPageClientProps {
  id: string;
}

export default function InspirationPageClient({ id }: InspirationPageClientProps) {
  const router = useRouter();
  const { categories, isLoading, error, fetchCategories } = useTemplateStore();
  const [inspirationExamples, setInspirationExamples] = useState<InspirationExample[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (categories && categories.length > 0 && id) {
      for (const category of categories) {
        const template = category.templates.find((t) => t.id === id);
        if (template && category.inspiration) {
          setInspirationExamples(category.inspiration.examples || []);
          setCategoryName(category.name);
          break;
        }
      }
    }
  }, [categories, id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
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
            <h3 className="font-semibold mb-2">Error loading inspiration</h3>
            <p>{error}</p>
            <Button onClick={() => fetchCategories()} variant="outline" className="mt-4">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 container max-w-6xl mx-auto py-4 md:py-8 px-4 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            className="w-fit -ml-2 text-muted-foreground hover:text-foreground"
            onClick={() => router.push(`/templates/${id}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Template
          </Button>
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Inspiration Gallery
            </h1>
          </div>
          <p className="text-muted-foreground">
            Check out these examples of {categoryName.toLowerCase()} to inspire your creativity.
          </p>
        </div>

        {inspirationExamples.length === 0 ? (
          <div className="p-8 text-center glass rounded-2xl">
            <h3 className="text-xl font-bold mb-2">No inspiration examples available</h3>
            <p className="text-muted-foreground mb-4">
              There are no examples available for this template category yet.
            </p>
            <Button onClick={() => router.push(`/templates/${id}`)} variant="secondary" className="rounded-full">
              Back to Template
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {inspirationExamples.map((example: InspirationExample) => (
              <div key={example.id} className="glass rounded-2xl overflow-hidden border-border/40">
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
                    <a
                      href={example.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${example.thumbnailUrl})` }}
                    >
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="text-white ml-1">
                            <polygon points="5 3 19 12 5 21 5 3" />
                          </svg>
                        </div>
                      </div>
                    </a>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-semibold mb-2">{example.title}</h3>
                  {example.description && (
                    <p className="text-sm text-muted-foreground mb-3">{example.description}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Source: {example.source}</span>
                    <a href={example.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      View Original
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <Button onClick={() => router.push(`/templates/${id}`)} variant="outline" className="rounded-full">
            Back to Template
          </Button>
        </div>
      </div>
    </div>
  );
}

function getYouTubeId(url: string): string {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : "";
}
