"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSmartNavigation } from "@/hooks/use-smart-navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Zap,
  Sparkles,
  Layers,
  Coins,
  Share2,
  Video,
  ArrowRight,
  ExternalLink,
} from "@/lib/icons";

// Step components
import { ThumbnailStep } from "./steps/thumbnail-step";
import { CoinDetailsStep } from "./steps/coin-details-step";
import { CurrencySelectionStep } from "./steps/currency-selection-step";
import { FormatStep } from "./steps/format-step";
import { PreviewStep } from "./steps/preview-step";
import { DeployStep } from "./steps/deploy-step";
import { triggerCelebration } from "@/lib/confetti";
import type { VideoFormat } from "@/lib/video-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCanvasStore } from "@/stores/canvas-store";

export interface MintWizardData {
  // Thumbnail data
  thumbnail: string | null;
  thumbnailPrompt: string;
  thumbnailSource: "ai" | "video_frame" | "timeline_media" | "upload" | null;

  // Coin details
  coinName: string;
  coinSymbol: string;
  coinDescription: string;

  // Currency selection
  currency: "ZORA" | "CREATOR_COIN" | "ETH";

  // Metadata
  metadataUri: string | null;

  // Export settings
  videoFormat: VideoFormat;

  // Deploy status
  isDeploying: boolean;
  deployedCoin: { name: string; symbol: string; address?: string } | null;
}

const STEPS = [
  {
    id: "format",
    title: "Video Format",
    description: "Choose your video aspect ratio",
    icon: Video,
  },
  {
    id: "thumbnail",
    title: "Thumbnail",
    description: "Create your coin's artwork",
    icon: Sparkles,
  },
  {
    id: "details",
    title: "Coin Details",
    description: "Name your new creation",
    icon: Layers,
  },
  {
    id: "currency",
    title: "Currency",
    description: "Choose backing asset",
    icon: Coins,
  },
  {
    id: "preview",
    title: "Review",
    description: "Check your configuration",
    icon: Zap,
  },
  {
    id: "deploy",
    title: "Deploy",
    description: "Launch to blockchain",
    icon: Zap,
  },
];

// Mobile steps: Details → Preview → Deploy (3 steps)
const MOBILE_STEPS = [
  { id: "details", title: "Coin Details", description: "Name your new creation", icon: Layers },
  { id: "preview", title: "Review", description: "Check your configuration", icon: Zap },
  { id: "deploy", title: "Deploy", description: "Launch to blockchain", icon: Zap },
];

interface MintWizardProps {
  projectId?: string;
  dataUrl?: string | null;
}

export function MintWizard({ projectId, dataUrl }: MintWizardProps) {
  const isMobile = useIsMobile();
  const { getFormat: getVideoFormat } = useCanvasStore();
  const { navigateToEditor } = useSmartNavigation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [wizardData, setWizardData] = useState<MintWizardData>({
    thumbnail: null,
    thumbnailPrompt: "",
    thumbnailSource: null,
    coinName: "",
    coinSymbol: "",
    coinDescription: "",
    currency: "ZORA", // Default to ZORA
    metadataUri: null,
    videoFormat: "portrait", // Default to mobile-first format
    isDeploying: false,
    deployedCoin: null,
  });

  const activeSteps = isMobile ? MOBILE_STEPS : STEPS;
  const prevIsMobileRef = useRef(isMobile);

  // Remap step index when switching between mobile/desktop flows
  useEffect(() => {
    if (prevIsMobileRef.current === isMobile) return;

    const previousSteps = prevIsMobileRef.current ? MOBILE_STEPS : STEPS;
    const nextSteps = isMobile ? MOBILE_STEPS : STEPS;
    const previousId = previousSteps[currentStep]?.id;
    const nextIndex = previousId
      ? nextSteps.findIndex((step) => step.id === previousId)
      : -1;

    if (nextIndex >= 0 && nextIndex !== currentStep) {
      setCurrentStep(nextIndex);
    } else if (nextIndex === -1 && nextSteps.length > 0) {
      // Default to first step if the previous step doesn't exist in the new flow
      setCurrentStep(0);
    }

    prevIsMobileRef.current = isMobile;
  }, [isMobile, currentStep]);

  // Clamp out-of-range indexes (e.g. during resize)
  useEffect(() => {
    if (currentStep >= activeSteps.length && activeSteps.length > 0) {
      setCurrentStep(activeSteps.length - 1);
    }
  }, [currentStep, activeSteps.length]);

  // Guard against transient out-of-range indexes (e.g. during resize)
  const safeStepIndex =
    activeSteps.length === 0
      ? 0
      : Math.min(currentStep, activeSteps.length - 1);
  const currentStepConfig = activeSteps[safeStepIndex];

  // Ensure we're on client side before doing anything
  useEffect(() => {
    setIsClient(true);
  }, []);

  const updateWizardData = useCallback((updates: Partial<MintWizardData>) => {
    setWizardData((prev: MintWizardData) => ({ ...prev, ...updates }));
  }, []);

  // Add error boundary for any runtime errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('Mint wizard error:', event.error);
      toast.error('An error occurred. Please refresh the page and try again.');
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      toast.error('An error occurred. Please refresh the page and try again.');
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, []);

  // Trigger celebration when deployment is complete
  useEffect(() => {
    if (wizardData.deployedCoin) {
      const timer = setTimeout(() => {
        triggerCelebration();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [wizardData.deployedCoin]);

  // Auto-detect format from canvas on mobile
  useEffect(() => {
    if (isMobile && isClient) {
      const detectedFormat = getVideoFormat();
      updateWizardData({ videoFormat: detectedFormat, currency: "ETH" });
    }
  }, [isMobile, isClient, getVideoFormat, updateWizardData]);

  const canProceedToNext = (stepIndex: number = currentStep) => {
    if (isMobile) {
      switch (stepIndex) {
        case 0: // Details step
          return wizardData.coinName.trim() !== "" && wizardData.coinSymbol.trim() !== "";
        case 1: // Preview step
          return wizardData.metadataUri !== null;
        case 2: // Deploy step
          return wizardData.deployedCoin !== null;
        default:
          return false;
      }
    }
    switch (stepIndex) {
      case 0: // Format step
        return wizardData.videoFormat !== undefined;
      case 1: // Thumbnail step
        return wizardData.thumbnail !== null;
      case 2: // Details step
        return (
          wizardData.coinName.trim() !== "" &&
          wizardData.coinSymbol.trim() !== ""
        );
      case 3: // Currency selection step
        return wizardData.currency !== undefined;
      case 4: // Preview step
        return wizardData.metadataUri !== null;
      case 5: // Deploy step
        return wizardData.deployedCoin !== null;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (safeStepIndex < activeSteps.length - 1 && canProceedToNext(safeStepIndex)) {
      setCurrentStep(safeStepIndex + 1);
    }
  };

  const prevStep = () => {
    if (safeStepIndex > 0) {
      setCurrentStep(safeStepIndex - 1);
    }
  };

  const progress =
    activeSteps.length > 0
      ? ((safeStepIndex + 1) / activeSteps.length) * 100
      : 0;
  const isLastStep =
    activeSteps.length > 0 && safeStepIndex === activeSteps.length - 1;

  const renderStep = () => {
    if (isMobile) {
      switch (safeStepIndex) {
        case 0:
          return <CoinDetailsStep data={wizardData} updateData={updateWizardData} />;
        case 1:
          return <PreviewStep data={wizardData} updateData={updateWizardData} />;
        case 2:
          return <DeployStep data={wizardData} updateData={updateWizardData} />;
        default:
          return null;
      }
    }
    switch (safeStepIndex) {
      case 0:
        return <FormatStep data={wizardData} updateData={updateWizardData} />;
      case 1:
        return (
          <ThumbnailStep data={wizardData} updateData={updateWizardData} />
        );
      case 2:
        return (
          <CoinDetailsStep data={wizardData} updateData={updateWizardData} />
        );
      case 3:
        return <CurrencySelectionStep data={wizardData} updateData={updateWizardData} />;
      case 4:
        return <PreviewStep data={wizardData} updateData={updateWizardData} />;
      case 5:
        return <DeployStep data={wizardData} updateData={updateWizardData} />;
      default:
        return null;
    }
  };

  if (isLoadingData || !isClient) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        <p className="text-muted-foreground animate-pulse">
          Initializing launchpad...
        </p>
      </div>
    );
  }

  // If deployment is complete, show success state
  if (wizardData.deployedCoin) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md mx-auto text-center space-y-8 py-12 px-6 glass rounded-[2.5rem] border-primary/20 shadow-2xl shadow-primary/10"
      >
        <div className="flex justify-center relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
          <div className="relative w-24 h-24 bg-primary rounded-full flex items-center justify-center shadow-2xl shadow-primary/40">
            <Check className="w-12 h-12 text-white" strokeWidth={3} />
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">Coin Deployed! 🎉</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your video <span className="text-foreground font-bold font-mono">&quot;{wizardData.deployedCoin.name}&quot;</span> ({wizardData.deployedCoin.symbol}) is now a live tradeable Zora Coin.
          </p>
          
          {wizardData.deployedCoin.address && (
            <div className="bg-muted/30 rounded-2xl p-4 border border-border/50 group mt-6">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-1 tracking-widest">
                Contract Address
              </div>
              <div className="font-mono text-[10px] break-all opacity-70 group-hover:opacity-100 transition-opacity">
                {wizardData.deployedCoin.address}
              </div>
              <Button
                variant="link"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(wizardData.deployedCoin?.address || "");
                  toast.success("Address copied!");
                }}
                className="text-primary text-[10px] h-auto p-0 mt-2 font-bold uppercase tracking-widest"
              >
                Copy Address
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Button asChild size="lg" className="w-full rounded-2xl h-14 font-bold shadow-lg shadow-primary/20 btn-hover">
            <a
              href={wizardData.deployedCoin?.address ? `https://zora.co/coin/base:${wizardData.deployedCoin.address}` : "/trade"}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-5 w-5" />
              View on Zora
            </a>
          </Button>
          
          <Button asChild variant="secondary" size="lg" className="w-full rounded-2xl h-14 font-bold">
            <a
              href={`https://warpcast.com/~/compose?text=${encodeURIComponent(
                `I just launched my new commentary coin "${wizardData.deployedCoin?.name || ""}" on SayWaht! 🎬🪙`
              )}&embeds[]=${encodeURIComponent(
                wizardData.deployedCoin?.address
                  ? `https://zora.co/coin/base:${wizardData.deployedCoin.address}`
                  : "https://saywaht.app"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Share2 className="mr-2 h-5 w-5" />
              Share on Farcaster
            </a>
          </Button>
          
          <div className="flex gap-3 mt-2">
            <Button asChild variant="ghost" className="flex-1 rounded-xl">
              <a href="/templates">Create Another</a>
            </Button>
            <Button asChild variant="ghost" className="flex-1 rounded-xl">
              <a href="/">Browse Feed</a>
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32 md:pb-8">
      {/* Progress Header */}
      <div className="glass rounded-[2rem] p-6 border-border/40 shadow-xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
           <motion.div 
             className="h-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
             initial={{ width: 0 }}
             animate={{ width: `${progress}%` }}
             transition={{ duration: 0.5, ease: "easeOut" }}
           />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              {(() => {
                const Icon = currentStepConfig?.icon || Zap;
                return <Icon className="w-6 h-6 text-primary" />;
              })()}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {currentStepConfig?.title || "Step"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {currentStepConfig?.description || "Continue"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {activeSteps.map((_, index) => (
              <div 
                key={index}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  index === currentStep ? "w-8 bg-primary" : 
                  index < currentStep ? "w-2 bg-primary/40" : "w-2 bg-muted"
                )}
              />
            ))}
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">
              {safeStepIndex + 1} / {activeSteps.length}
            </span>
          </div>
        </div>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="min-h-[400px]"
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation - Desktop */}
      <div className="hidden md:flex justify-between items-center glass p-4 rounded-2xl border-border/40">
        <Button
          variant="ghost"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="rounded-xl px-6"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="rounded-xl px-6"
            onClick={() => navigateToEditor()}
          >
            Cancel
          </Button>
          <Button
            onClick={nextStep}
            disabled={!canProceedToNext() || wizardData.isDeploying}
            className="rounded-xl px-8 font-bold shadow-lg shadow-primary/10"
          >
            {isLastStep ? (
              wizardData.isDeploying ? "Launching..." : "Deploy Coin"
            ) : (
              <>
                Next Step
                <ChevronRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Sticky Navigation */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-50 p-4 bg-background/80 backdrop-blur-xl border-t border-border/50"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)" }}
      >
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="h-14 w-14 rounded-2xl p-0 flex-shrink-0"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            onClick={nextStep}
            disabled={!canProceedToNext() || wizardData.isDeploying}
            className="h-14 flex-1 rounded-2xl font-bold text-lg shadow-xl shadow-primary/20"
          >
            {isLastStep ? (
              wizardData.isDeploying ? "Launching..." : "Deploy Coin"
            ) : (
              <>
                Continue
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
