"use client";

import React from "react";
import { useTemplateStore } from "@/stores/template-store";
import { TemplateCategoryCard } from "./template-category-card";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export function TemplateBrowser() {
  const { categories, isLoading, error, fetchCategories, recentTemplates } = useTemplateStore();
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Filter templates based on search query
  const filteredCategories = categories.map(category => {
    return {
      ...category,
      templates: category.templates.filter(template => {
        const query = searchQuery.toLowerCase();
        return (
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query) ||
          (template.tags && template.tags.some(tag => tag.toLowerCase().includes(query))) ||
          template.id.toLowerCase().includes(query)
        );
      })
    };
  }).filter(category => category.templates.length > 0);

  // Show loading state
  if (isLoading) {
    return (
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
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="p-4 bg-red-500/20 text-red-100 rounded-lg">
        <h3 className="font-semibold mb-2">Error loading templates</h3>
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

  // No categories found
  if (categories.length === 0) {
    return (
      <div className="p-8 text-center text-white/80">
        <h3 className="text-xl font-medium mb-2">No Templates Available</h3>
        <p>
          Check back later for new templates or create your own project from
          scratch.
        </p>
      </div>
    );
  }

  // No search results
  if (filteredCategories.length === 0) {
    return (
      <div className="p-8 text-center text-white/80">
        <h3 className="text-xl font-medium mb-2">No Templates Found</h3>
        <p>
          Your search "{searchQuery}" didn't match any templates. Try a different search term.
        </p>
        <Button
          onClick={() => setSearchQuery("")}
          variant="outline"
          className="mt-4 bg-white/10 text-white hover:bg-white/20"
        >
          Clear Search
        </Button>
      </div>
    );
  }

  // Render categories with aspect ratio organization
  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="mb-8">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search templates by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder-white/50 w-full py-2 pl-10 pr-4"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
              aria-label="Clear search"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="m15 9-6 6"></path>
                <path d="m9 9 6 6"></path>
              </svg>
            </button>
          )}
        </div>
        <p className="text-sm text-white/60 mt-2 text-right">
          Found {filteredCategories.reduce((total, category) => total + category.templates.length, 0)} templates
        </p>
      </div>

      {/* Recent Templates Section */}
      {recentTemplates.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                <path d="M12 6v6l4 2"></path>
              </svg>
              Recently Used
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/60 hover:text-white"
              onClick={() => useTemplateStore.getState().clearRecentTemplates()}
            >
              Clear All
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTemplates.map((template) => (
              <TemplateCategoryCard
                key={template.id}
                template={template}
                showRecentBadge={true}
              />
            ))}
          </div>
        </div>
      )}

      {filteredCategories.map((category) => {
        // Group templates by aspect ratio
        const portraitTemplates = category.templates.filter(
          (t) => t.aspectRatio === "portrait"
        );
        const squareTemplates = category.templates.filter(
          (t) => t.aspectRatio === "square"
        );
        const landscapeTemplates = category.templates.filter(
          (t) => t.aspectRatio === "landscape" || !t.aspectRatio
        );

        return (
          <div key={category.id} className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {category.name}
              </h2>
              <p className="text-white/80">{category.description}</p>
            </div>

            {/* Portrait Templates (Mobile-First) */}
            {portraitTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-green-300 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="7" y="2" width="10" height="20" rx="2" ry="2" />
                  </svg>
                  Portrait (Mobile-First) • Recommended for Zora
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {portraitTemplates.map((template) => (
                    <TemplateCategoryCard
                      key={template.id}
                      template={template}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Square Templates */}
            {squareTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-blue-300 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  </svg>
                  Square (Universal)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {squareTemplates.map((template) => (
                    <TemplateCategoryCard
                      key={template.id}
                      template={template}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Landscape Templates */}
            {landscapeTemplates.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-orange-300 flex items-center gap-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="2" y="7" width="20" height="10" rx="2" ry="2" />
                  </svg>
                  Landscape (Traditional)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {landscapeTemplates.map((template) => (
                    <TemplateCategoryCard
                      key={template.id}
                      template={template}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
