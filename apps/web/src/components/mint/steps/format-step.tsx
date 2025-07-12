"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LuSmartphone, LuSquare, LuMonitor } from "react-icons/lu";
import type { VideoFormat } from "@/lib/canvas-export-utils";
import { MintWizardData } from "../mint-wizard";

interface FormatStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const FORMAT_OPTIONS = [
  {
    id: "portrait" as VideoFormat,
    title: "Portrait",
    subtitle: "9:16 • Mobile-First",
    description:
      "Optimized for mobile viewing and social sharing. Best for Zora's mobile-first audience.",
    icon: LuSmartphone,
    dimensions: "720×1280",
    recommended: true,
    pros: [
      "Perfect for mobile feeds",
      "Higher engagement on Zora",
      "Social media ready",
    ],
    cons: ["Less ideal for desktop viewing"],
  },
  {
    id: "square" as VideoFormat,
    title: "Square",
    subtitle: "1:1 • Universal",
    description:
      "Works well on both mobile and desktop. Good compromise for all platforms.",
    icon: LuSquare,
    dimensions: "720×720",
    recommended: false,
    pros: [
      "Universal compatibility",
      "Good for all devices",
      "Clean, modern look",
    ],
    cons: ["Not optimized for any specific platform"],
  },
  {
    id: "landscape" as VideoFormat,
    title: "Landscape",
    subtitle: "16:9 • Traditional",
    description:
      "Traditional video format. Better for desktop but less optimal for mobile.",
    icon: LuMonitor,
    dimensions: "1280×720",
    recommended: false,
    pros: ["Familiar format", "Good for desktop", "Wide field of view"],
    cons: ["Poor mobile experience", "Lower engagement on Zora"],
  },
];

export function FormatStep({
  data,
  updateData,
  onNext,
  onBack,
}: FormatStepProps) {
  const handleFormatSelect = (format: VideoFormat) => {
    updateData({ videoFormat: format });
  };

  const selectedFormat = data.videoFormat;
  const canProceed = !!selectedFormat;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Video Format</h2>
        <p className="text-muted-foreground">
          Select the optimal format for your content. We recommend Portrait for
          the best Zora experience.
        </p>
      </div>

      <div className="grid gap-4">
        {FORMAT_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedFormat === option.id;

          return (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                isSelected ? "ring-2 ring-primary border-primary" : ""
              }`}
              onClick={() => handleFormatSelect(option.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">
                          {option.title}
                        </CardTitle>
                        {option.recommended && (
                          <Badge variant="default" className="text-xs">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {option.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-muted-foreground">
                      {option.dimensions}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  {option.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="font-medium text-green-600 mb-1">Pros:</p>
                    <ul className="space-y-1">
                      {option.pros.map((pro, index) => (
                        <li key={index} className="text-muted-foreground">
                          • {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-orange-600 mb-1">Cons:</p>
                    <ul className="space-y-1">
                      {option.cons.map((con, index) => (
                        <li key={index} className="text-muted-foreground">
                          • {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-blue-600">
            <LuSmartphone size={20} />
          </div>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Why Portrait?
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Zora is primarily used on mobile devices. Portrait videos get 2-3x
              more engagement and are optimized for the mobile feed experience
              that users expect.
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Continue
        </Button>
      </div>
    </div>
  );
}
