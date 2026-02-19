"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTemplateStore } from "@/stores/template-store";
import { Template, TemplateCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HoverVideoPreview } from "./hover-video-preview";
import { Play, Zap, Flame, Award, Music, Smartphone, Sparkles, ChevronRight, Loader2 } from "@/lib/icons";
import { resolveIpfsUrl, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

export function MobileTemplateBrowser() {
  const { categories, isLoading, selectTemplate, applySelectedTemplate } = useTemplateStore();
  const [activeCategoryId, setActiveCategoryId] = useState<string>("all");
  const [isApplying, setIsApplying] = useState<string | null>(null);
  const router = useRouter();

  const allTemplates = useMemo(() => {
    return categories.flatMap(c => c.templates.map(t => ({ ...t, categoryName: c.name })));
  }, [categories]);

  const filteredTemplates = useMemo(() => {
    if (activeCategoryId === "all") return allTemplates;
    const category = categories.find(c => c.id === activeCategoryId);
    return category ? category.templates.map(t => ({ ...t, categoryName: category.name })) : [];
  }, [activeCategoryId, allTemplates, categories]);

  const handleUseTemplate = async (template: Template) => {
    setIsApplying(template.id);
    try {
      await selectTemplate(template.id);
      const success = await applySelectedTemplate();
      if (success) {
        router.push("/editor");
      }
    } catch (error) {
      console.error("Failed to apply template:", error);
      toast.error("Failed to load template");
    } finally {
      setIsApplying(null);
    }
  };

  if (isLoading && categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm font-black uppercase tracking-widest text-muted-foreground animate-pulse">
          Loading Creative Library
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Dynamic Category Tabs - Sticky */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full bg-white/5 h-10 w-10 shrink-0"
            onClick={() => router.back()}
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
          </Button>
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            <button
              onClick={() => setActiveCategoryId("all")}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                activeCategoryId === "all" 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              All Packs
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategoryId(category.id)}
                className={cn(
                  "px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeCategoryId === category.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* High-Impact Feed */}
      <div className="flex-1 px-4 py-6 space-y-10 pb-32">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map((template, index) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative group"
            >
              {/* Template Card */}
              <div className="bg-white/[0.03] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all active:scale-[0.98]">
                {/* Visual Preview Section */}
                <div className="aspect-[4/5] relative overflow-hidden">
                  <HoverVideoPreview
                    videoSrc={resolveIpfsUrl(template.thumbnailUrl || "")}
                    alt={template.name}
                    className="w-full h-full"
                  />
                  
                  {/* Badges Overlay */}
                  <div className="absolute top-6 left-6 flex flex-col gap-2">
                    <Badge className="bg-black/60 backdrop-blur-xl border-white/10 text-[10px] font-black uppercase tracking-widest py-1.5 px-3">
                      <Sparkles className="w-3 h-3 mr-1.5 text-yellow-400" />
                      {template.categoryName || "Premium"}
                    </Badge>
                    {template.hasAudio && (
                      <Badge className="bg-primary/20 backdrop-blur-xl border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest py-1.5 px-3">
                        <Music className="w-3 h-3 mr-1.5" />
                        Audio Ready
                      </Badge>
                    )}
                  </div>

                  {/* Play Hint */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-2xl border border-white/20 flex items-center justify-center">
                      <Play className="w-8 h-8 text-white fill-white ml-1" />
                    </div>
                  </div>
                </div>

                {/* Info Section */}
                <div className="p-8 space-y-6 bg-gradient-to-b from-transparent to-black/40">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-none">
                      {template.name}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-2">
                      {template.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Button
                      size="lg"
                      className="flex-1 h-16 rounded-2xl bg-white text-black hover:bg-white/90 font-black uppercase tracking-widest shadow-xl transition-all group/btn"
                      onClick={() => handleUseTemplate(template)}
                      disabled={isApplying !== null}
                    >
                      {isApplying === template.id ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          Use This Template
                          <ChevronRight className="w-5 h-5 ml-2 transition-transform group-hover/btn:translate-x-1" />
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-16 w-16 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10"
                      onClick={() => router.push(`/templates/${template.id}`)}
                    >
                      <Award className="w-6 h-6 text-white/60" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs px-10">
              No templates found in this category
            </p>
            <Button variant="link" onClick={() => setActiveCategoryId("all")}>
              Back to All
            </Button>
          </div>
        )}
      </div>

      {/* Fixed Navigation Hint */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40">
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
            Scroll to Explore
          </span>
        </div>
      </div>
    </div>
  );
}
