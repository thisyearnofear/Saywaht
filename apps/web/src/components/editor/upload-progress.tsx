"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Fun facts about Filecoin/IPFS to show during upload
const filecoinFunFacts = [
  "Filecoin uses proof-of-storage to ensure your data is safely stored",
  "Your video is being replicated across a global network of storage providers",
  "Filecoin's decentralized storage is more resilient than traditional cloud",
  "The Filecoin network has over 4 exbibytes of storage capacity",
  "Your data is encrypted and distributed across multiple geographic regions",
  "Filecoin storage costs are often 90% cheaper than traditional cloud storage",
  "The Filecoin network was launched by Protocol Labs in 2020",
  "Each piece of your data is verified regularly for integrity",
];

interface UploadProgressProps {
  isOpen: boolean;
  progress: number; // 0-100
  stage: "preparing" | "uploading" | "archiving" | "complete";
  estimatedTimeRemaining?: number; // in seconds
  speed?: number; // MB/s
  onComplete?: () => void;
}

export function UploadProgress({
  isOpen,
  progress,
  stage,
  estimatedTimeRemaining,
  speed,
  onComplete,
}: UploadProgressProps) {
  const [funFact, setFunFact] = useState(filecoinFunFacts[0]);

  useEffect(() => {
    // Rotate fun facts every 10 seconds
    const interval = setInterval(() => {
      setFunFact(
        filecoinFunFacts[Math.floor(Math.random() * filecoinFunFacts.length)]
      );
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getStageMessage = () => {
    switch (stage) {
      case "preparing":
        return "Preparing your video...";
      case "uploading":
        return "Uploading to storage network...";
      case "archiving":
        return "Your video is being stored permanently on Filecoin...";
      case "complete":
        return "Your video is live!";
      default:
        return "Processing...";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onComplete?.()}>
      <DialogContent className="sm:max-w-md">
        <div className="py-6 space-y-6">
          {/* Animated Progress Ring */}
          <div className="flex justify-center">
            <div className="relative w-32 h-32">
              {/* Background ring */}
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-muted"
                />
                {/* Progress ring */}
                <motion.circle
                  cx="64"
                  cy="64"
                  r="56"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  strokeLinecap="round"
                  className="text-primary"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: progress / 100 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>

              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  className="text-2xl font-bold"
                  key={Math.round(progress)}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                >
                  {Math.round(progress)}%
                </motion.span>
                {stage === "complete" && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-green-500"
                  >
                    ✓
                  </motion.span>
                )}
              </div>
            </div>
          </div>

          {/* Stage message */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{getStageMessage()}</h3>
            {stage === "archiving" && (
              <p className="text-sm text-muted-foreground animate-pulse">
                💾 {funFact}
              </p>
            )}
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-6 text-sm">
            {estimatedTimeRemaining !== undefined && (
              <div className="text-center">
                <p className="text-muted-foreground">ETA</p>
                <p className="font-semibold">{formatTime(estimatedTimeRemaining)}</p>
              </div>
            )}
            {speed !== undefined && (
              <div className="text-center">
                <p className="text-muted-foreground">Speed</p>
                <p className="font-semibold">{speed.toFixed(1)} MB/s</p>
              </div>
            )}
          </div>

          {/* Complete state actions */}
          {stage === "complete" && (
            <div className="flex justify-center gap-3">
              <Button variant="outline" onClick={onComplete}>
                Continue Editing
              </Button>
              <Button onClick={onComplete}>Share Video</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage upload progress state
export function useUploadProgress() {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<UploadProgressProps["stage"]>("preparing");
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>();
  const [speed, setSpeed] = useState<number>();

  const startUpload = () => {
    setIsOpen(true);
    setProgress(0);
    setStage("preparing");
    setEstimatedTimeRemaining(undefined);
    setSpeed(undefined);
  };

  const updateProgress = (newProgress: number, newStage?: UploadProgressProps["stage"]) => {
    setProgress(newProgress);
    if (newStage) setStage(newStage);
  };

  const setUploadStats = (eta?: number, uploadSpeed?: number) => {
    setEstimatedTimeRemaining(eta);
    setSpeed(uploadSpeed);
  };

  const completeUpload = () => {
    setProgress(100);
    setStage("complete");
  };

  const close = () => {
    setIsOpen(false);
    setProgress(0);
    setStage("preparing");
  };

  return {
    isOpen,
    progress,
    stage,
    estimatedTimeRemaining,
    speed,
    startUpload,
    updateProgress,
    setUploadStats,
    completeUpload,
    close,
  };
}