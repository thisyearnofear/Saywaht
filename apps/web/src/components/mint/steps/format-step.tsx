"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Square, Monitor, Check } from "@/lib/icons";
import type { VideoFormat } from "@/lib/video-utils";
import { MintWizardData } from "../mint-wizard";
import { cn } from "@/lib/utils";

interface FormatStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

const FORMAT_OPTIONS = [
  {
    id: "portrait" as VideoFormat,
    title: "Portrait",
    subtitle: "9:16 • Mobile-First",
    description:
      "Optimized for mobile viewing and social sharing. Best for Zora's mobile-first audience.",
    icon: Smartphone,
    dimensions: "720×1280",
    recommended: true,
    accent: "text-green-500 bg-green-500/10",
  },
  {
    id: "square" as VideoFormat,
    title: "Square",
    subtitle: "1:1 • Universal",
    description:
      "Works well on both mobile and desktop. Good compromise for all platforms.",
    icon: Square,
    dimensions: "720×720",
    recommended: false,
    accent: "text-blue-500 bg-blue-500/10",
  },
  {
    id: "landscape" as VideoFormat,
    title: "Landscape",
    subtitle: "16:9 • Traditional",
    description:
      "Traditional video format. Better for desktop but less optimal for mobile.",
    icon: Monitor,
    dimensions: "1280×720",
    recommended: false,
    accent: "text-orange-500 bg-orange-500/10",
  },
];

export function FormatStep({ data, updateData }: FormatStepProps) {
  const handleFormatSelect = (format: VideoFormat) => {
    updateData({ videoFormat: format });
  };

  const selectedFormat = data.videoFormat;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid gap-4">
        {FORMAT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedFormat === option.id;

          return (
            <div
              key={option.id}
              className={cn(
                "relative cursor-pointer transition-all duration-300 rounded-[2rem] p-6 border-2 group",
                isSelected 
                  ? "bg-primary/5 border-primary shadow-lg shadow-primary/5" 
                  : "bg-card border-border/50 hover:border-primary/30 hover:bg-primary/5"
              )}
              onClick={() => handleFormatSelect(option.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-5">
                  <div
                    className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                      isSelected
                        ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20"
                        : "bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                    )}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold tracking-tight">
                        {option.title}
                      </h3>
                      {option.recommended && (
                        <Badge className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-widest">
                          Recommended
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {option.subtitle}
                    </p>
                  </div>
                </div>
                
                {isSelected && (
                  <div className="bg-primary text-white rounded-full p-1.5 shadow-lg animate-scale-in">
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                )}
                
                {!isSelected && (
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                      {option.dimensions}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-4 pl-1 inline-block">
                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                  {option.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass rounded-3xl p-6 border-primary/20 bg-primary/5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h4 className="font-bold text-foreground">Why Portrait?</h4>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            Zora is a mobile-first protocol. Portrait videos generate significantly higher engagement and collectors, as they fit the natural scrolling behavior of mobile users.
          </p>
        </div>
      </div>
    </div>
  );
}
