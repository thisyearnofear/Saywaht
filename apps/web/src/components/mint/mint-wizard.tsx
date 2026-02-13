"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "motion/react";
import {
  LuChevronLeft as ChevronLeft,
  LuChevronRight as ChevronRight,
  LuCheck as Check,
} from "react-icons/lu";

// Step components
import { ThumbnailStep } from "./steps/thumbnail-step";
import { CoinDetailsStep } from "./steps/coin-details-step";
import { CurrencySelectionStep } from "./steps/currency-selection-step";
import { FormatStep } from "./steps/format-step";
import { PreviewStep } from "./steps/preview-step";
import { DeployStep } from "./steps/deploy-step";
import { triggerCelebration } from "@/lib/confetti";
import { useEffect } from "react";
import type { VideoFormat } from "@/lib/video-utils";
import { toast } from "sonner";

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
    description: "Choose the optimal format for your content",
  },
  {
    id: "thumbnail",
    title: "Create Thumbnail",
    description: "Generate an eye-catching thumbnail for your coin",
  },
  {
    id: "details",
    title: "Coin Details",
    description: "Set your coin name, symbol, and description",
  },
  {
    id: "currency",
    title: "Backing Currency",
    description: "Choose what currency backs your coin",
  },
  {
    id: "preview",
    title: "Preview & Review",
    description: "Review everything before deployment",
  },
  {
    id: "deploy",
    title: "Deploy Coin",
    description: "Deploy your coin to the blockchain",
  },
];

interface MintWizardProps {
  projectId?: string;
  dataUrl?: string | null;
}

export function MintWizard({ projectId, dataUrl }: MintWizardProps) {
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

  // Ensure we're on client side before doing anything
  useEffect(() => {
    setIsClient(true);

    // Log any initialization errors
    if (typeof window !== 'undefined') {
      console.log('🪙 Mint wizard initialized');
      console.log('Project ID:', projectId);
      console.log('Data URL:', dataUrl ? 'provided' : 'not provided');
    }
  }, [projectId, dataUrl]);

  const updateWizardData = useCallback((updates: Partial<MintWizardData>) => {
    setWizardData((prev: MintWizardData) => ({ ...prev, ...updates }));
  }, []);

  // Skip automatic data loading to avoid serverless function issues
  // Users can manually set up their coin details
  useEffect(() => {
    if (isClient && dataUrl) {
      console.log("Project data URL available:", dataUrl);
      console.log(
        "Note: Automatic data loading disabled to avoid serverless function issues"
      );
      console.log("Users can manually configure their coin details");
    }
  }, [dataUrl, isClient]);

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

  // Trigger confetti when deployment is complete
  useEffect(() => {
    if (wizardData.deployedCoin) {
      const timer = setTimeout(() => {
        triggerCelebration();
      }, 500); // Delay to let the animation settle

      return () => clearTimeout(timer);
    }
  }, [wizardData.deployedCoin]);

  const canProceedToNext = () => {
    switch (currentStep) {
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
        // Allow proceeding if metadata is ready, regardless of video upload status
        // This allows users to deploy with thumbnail only if video upload fails
        return wizardData.metadataUri !== null;
      case 5: // Deploy step
        return wizardData.deployedCoin !== null;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1 && canProceedToNext()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const isLastStep = currentStep === STEPS.length - 1;

  const renderStep = () => {
    switch (currentStep) {
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

  // Show loading state while fetching project data or during SSR
  if (isLoadingData || !isClient) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-muted-foreground">
          {isClient ? "Loading project data from IPFS..." : "Initializing..."}
        </p>
      </div>
    );
  }

  // If deployment is complete, show success state
  if (wizardData.deployedCoin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <div className="w-8 h-8 text-green-500">
              <Check />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-2">Coin Deployed! 🎉</h2>
          <p className="text-muted-foreground mb-3">
            Your video &quot;{wizardData.deployedCoin.name}&quot; (
            {wizardData.deployedCoin.symbol}) is now a tradeable Zora Coin.
          </p>
          {wizardData.deployedCoin.address && (
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <div className="text-muted-foreground mb-1">
                Contract Address:
              </div>
              <div className="font-mono text-xs break-all">
                {wizardData.deployedCoin.address}
              </div>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(
                    wizardData.deployedCoin?.address || ""
                  )
                }
                className="text-primary hover:underline text-xs mt-1"
              >
                Copy Address
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <Button asChild className="w-full">
            <a
              href={wizardData.deployedCoin?.address ? `https://zora.co/coin/base:${wizardData.deployedCoin.address}` : "/trade"}
              target={wizardData.deployedCoin?.address ? "_blank" : undefined}
              rel={wizardData.deployedCoin?.address ? "noopener noreferrer" : undefined}
            >
              🪙 View Your Coin
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a
              href={`https://warpcast.com/~/compose?text=${encodeURIComponent(
                `Check out my new commentary coin "${wizardData.deployedCoin?.name || ""}" on SayWaht! 🎬🪙`
              )}&embeds[]=${encodeURIComponent(
                wizardData.deployedCoin?.address
                  ? `https://zora.co/coin/base:${wizardData.deployedCoin.address}`
                  : "https://saywaht.app"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share to Farcaster
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a href="/templates">🎨 Create Another</a>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <a href="/">Browse Gallery</a>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-28 md:pb-0">
      {/* Progress Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <CardTitle className="text-lg">
                {STEPS[currentStep].title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {STEPS[currentStep].description}
              </p>
            </div>
            <Badge variant="secondary">
              Step {currentStep + 1} of {STEPS.length}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between mt-4">
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center ${index < STEPS.length - 1 ? "flex-1" : ""
                  }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                      ? "bg-primary/20 text-primary border-2 border-primary"
                      : "bg-muted text-muted-foreground"
                    }`}
                >
                  {index < currentStep ? (
                    <div className="w-4 h-4">
                      <Check />
                    </div>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${index < currentStep ? "bg-primary" : "bg-muted"
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardHeader>
      </Card>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <Card className="hidden md:block">
        <CardContent className="pt-6">
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <div className="w-4 h-4 mr-2">
                <ChevronLeft />
              </div>
              Previous
            </Button>

            <Button
              onClick={nextStep}
              disabled={!canProceedToNext() || wizardData.isDeploying}
            >
              {isLastStep ? (
                wizardData.isDeploying ? (
                  "Deploying..."
                ) : (
                  "Deploy Coin"
                )
              ) : (
                <>
                  Next
                  <div className="w-4 h-4 ml-2">
                    <ChevronRight />
                  </div>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Sticky Navigation */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <div className="max-w-4xl mx-auto px-4 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="h-11"
            >
              <div className="w-4 h-4 mr-2">
                <ChevronLeft />
              </div>
              Previous
            </Button>

            <Button
              onClick={nextStep}
              disabled={!canProceedToNext() || wizardData.isDeploying}
              className="h-11"
            >
              {isLastStep ? (
                wizardData.isDeploying ? (
                  "Deploying..."
                ) : (
                  "Deploy Coin"
                )
              ) : (
                <>
                  Next
                  <div className="w-4 h-4 ml-2">
                    <ChevronRight />
                  </div>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
