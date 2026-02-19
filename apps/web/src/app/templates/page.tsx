"use client";

import React from "react";
import { TemplateBrowser } from "@/components/templates/template-browser";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { ArrowLeft, Layers, Sparkles, Zap } from "@/lib/icons";

export default function TemplatesPage() {
  const router = useRouter();

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      <Header />

      <main className="flex-1 flex flex-col overflow-y-auto touch-manipulation md:pb-12 bg-muted/10 relative">
        {/* Main Content - Compact for mobile */}
        <div className="relative container max-w-7xl mx-auto px-3 py-4 md:py-12 flex-1">
          {/* Header Section - Compact */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-6 md:mb-12 gap-4">
            <div className="flex flex-col items-center md:items-start text-center md:text-left w-full">
              <Button
                onClick={() => router.back()}
                variant="ghost"
                size="sm"
                className="mb-2 -ml-1 text-muted-foreground hover:text-foreground text-sm"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back
              </Button>
              <h1 className="text-2xl md:text-5xl font-bold tracking-tight mb-2">
                Choose a{" "}
                <span className="gradient-text">
                  Template
                </span>
              </h1>
              <p className="text-sm md:text-lg text-muted-foreground max-w-xl">
                Jumpstart your creativity with professionally designed templates.
              </p>
            </div>

            {/* Quick Stats - Hidden on very small screens */}
            <div className="hidden sm:grid grid-cols-3 gap-2 md:gap-4 w-full md:w-auto">
              <div className="glass rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col items-center justify-center text-center">
                <Layers className="h-3 w-3 md:h-4 md:w-4 text-primary mb-1" />
                <div className="text-sm md:text-xl font-bold">12+</div>
                <div className="text-[8px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Layouts</div>
              </div>
              <div className="glass rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col items-center justify-center text-center">
                <Sparkles className="h-3 w-3 md:h-4 md:w-4 text-accent mb-1" />
                <div className="text-sm md:text-xl font-bold">HD</div>
                <div className="text-[8px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quality</div>
              </div>
              <div className="glass rounded-lg md:rounded-xl p-2 md:p-4 flex flex-col items-center justify-center text-center">
                <Zap className="h-3 w-3 md:h-4 md:w-4 text-yellow-500 mb-1" />
                <div className="text-sm md:text-xl font-bold">1-Click</div>
                <div className="text-[8px] md:text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Minting</div>
              </div>
            </div>
          </div>

          {/* Template Browser Container */}
          <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-2xl p-1 md:p-8 shadow-2xl">
            <TemplateBrowser />
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>Don&apos;t see what you&apos;re looking for? Start from <Button variant="link" className="p-0 h-auto text-primary" onClick={() => router.push('/editor')}>scratch</Button>.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
