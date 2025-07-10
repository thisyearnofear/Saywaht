"use client";

import React from '@/lib/hooks-provider';
import { useTemplateStore } from "@/stores/template-store";
import { TemplateCategoryCard } from "./template-category-card";
import { Button } from "@/components/ui/button";
import { useEffect } from '@/lib/hooks-provider';

export function TemplateBrowser() {
  const { categories, isLoading, error, fetchCategories } = useTemplateStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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

  // Render categories
  return (
    <div className="space-y-8">
      {categories.map((category) => (
        <div key={category.id} className="space-y-4">
          <h2 className="text-xl font-semibold text-white">{category.name}</h2>
          <p className="text-white/80">{category.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {category.templates.map((template) => (
              <TemplateCategoryCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
