"use client";

import { useState } from "@/lib/hooks-provider";
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
import { PreviewStep } from "./steps/preview-step";
import { DeployStep } from "./steps/deploy-step";

export interface MintWizardData {
  // Thumbnail data
  thumbnail: string | null;
  thumbnailPrompt: string;

  // Coin details
  coinName: string;
  coinSymbol: string;
  coinDescription: string;

  // Metadata
  metadataUri: string | null;

  // Deploy status
  isDeploying: boolean;
  deployedCoin: { name: string; symbol: string } | null;
}

const STEPS = [
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

export function MintWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardData, setWizardData] = useState<MintWizardData>({
    thumbnail: null,
    thumbnailPrompt: "",
    coinName: "",
    coinSymbol: "",
    coinDescription: "",
    metadataUri: null,
    isDeploying: false,
    deployedCoin: null,
  });

  const updateWizardData = (updates: Partial<MintWizardData>) => {
    setWizardData((prev: MintWizardData) => ({ ...prev, ...updates }));
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Thumbnail step
        return wizardData.thumbnail !== null;
      case 1: // Details step
        return (
          wizardData.coinName.trim() !== "" &&
          wizardData.coinSymbol.trim() !== ""
        );
      case 2: // Preview step
        return true; // Can always proceed from preview
      case 3: // Deploy step
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

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ThumbnailStep data={wizardData} updateData={updateWizardData} />
        );
      case 1:
        return (
          <CoinDetailsStep data={wizardData} updateData={updateWizardData} />
        );
      case 2:
        return <PreviewStep data={wizardData} updateData={updateWizardData} />;
      case 3:
        return <DeployStep data={wizardData} updateData={updateWizardData} />;
      default:
        return null;
    }
  };

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
          <p className="text-muted-foreground">
            Your video &quot;{wizardData.deployedCoin.name}&quot; (
            {wizardData.deployedCoin.symbol}) is now a tradeable Zora Coin.
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <Button asChild className="w-full">
            <a
              href="https://zora.co/"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Zora
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a
              href="https://warpcast.com/~/compose?text=Check%20out%20my%20new%20commentary!"
              target="_blank"
              rel="noopener noreferrer"
            >
              Share to Farcaster
            </a>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
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
                className={`flex items-center ${
                  index < STEPS.length - 1 ? "flex-1" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStep
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
                    className={`flex-1 h-0.5 mx-2 ${
                      index < currentStep ? "bg-primary" : "bg-muted"
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
      <Card>
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
              {currentStep === STEPS.length - 1 ? (
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
    </div>
  );
}
