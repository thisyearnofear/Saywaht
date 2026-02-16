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
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col relative overflow-y-auto">
        {/* Background Visual Elements - Subtle and matching brand */}
        <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-60 -left-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        {/* Main Content */}
        <div className="relative container max-w-7xl mx-auto px-4 py-6 md:py-12 flex-1">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <Button
                onClick={() => router.back()}
                variant="ghost"
                size="sm"
                className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Choose a{" "}
                <span className="gradient-text">
                  Template
                </span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl">
                Jumpstart your creativity with professionally designed templates optimized for social engagement.
              </p>
            </div>

            {/* Quick Stats/Features */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full md:w-auto">
              <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                <div className="text-xl font-bold">12+</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Layouts</div>
              </div>
              <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center mb-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                </div>
                <div className="text-xl font-bold">HD</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Quality</div>
              </div>
              <div className="glass rounded-xl p-4 flex flex-col items-center justify-center text-center col-span-2 md:col-span-1">
                <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center mb-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                </div>
                <div className="text-xl font-bold">1-Click</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Minting</div>
              </div>
            </div>
          </div>

          {/* Template Browser Container */}
          <div className="bg-card/30 backdrop-blur-sm border border-border/50 rounded-2xl p-1 md:p-8 shadow-2xl">
            <TemplateBrowser />
          </div>

          {/* Footer Note */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>Don't see what you're looking for? Start from <Button variant="link" className="p-0 h-auto text-primary" onClick={() => router.push('/editor')}>scratch</Button>.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
