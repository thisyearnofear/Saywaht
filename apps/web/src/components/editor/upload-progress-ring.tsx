"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface UploadProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  animated?: boolean;
}

const filecoinFunFacts = [
  "Filecoin is the largest decentralized storage network",
  "Your video is being stored across thousands of nodes worldwide",
  "Filecoin uses proof-of-storage to ensure your data is safe",
  "Data stored on Filecoin can be retrieved anytime",
  "Filecoin has over 4,000 storage providers globally",
  "Your content is encrypted and distributed across the network",
  "Filecoin's mission is to store humanity's most important data",
  "Decentralized storage is more resilient than centralized alternatives",
];

export function UploadProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  showPercentage = true,
  animated = true,
}: UploadProgressRingProps) {
  const [currentFact, setCurrentFact] = useState(filecoinFunFacts[0]);
  const [factIndex, setFactIndex] = useState(0);

  // Rotate fun facts every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((i) => (i + 1) % filecoinFunFacts.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentFact(filecoinFunFacts[factIndex]);
  }, [factIndex]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress Ring */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Background ring */}
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-muted/20"
          />
          {/* Progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: animated ? 0.5 : 0, ease: "easeOut" }}
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8b5cf6" />
              <stop offset="50%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {showPercentage && (
            <motion.span
              className="text-2xl font-black"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {Math.round(progress)}%
            </motion.span>
          )}
        </div>

        {/* Animated particles */}
        {animated && progress < 100 && (
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-primary/60"
                style={{
                  left: "50%",
                  top: "50%",
                }}
                animate={{
                  rotate: 360,
                  opacity: [0, 1, 0],
                  scale: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "linear",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold text-foreground">
          {progress < 30
            ? "Initializing upload..."
            : progress < 70
            ? "Uploading to Filecoin..."
            : progress < 100
            ? "Finalizing storage deal..."
            : "Upload complete!"}
        </p>
        
        {/* Fun fact */}
        <motion.p
          key={currentFact}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-muted-foreground max-w-[280px]"
        >
          💡 {currentFact}
        </motion.p>
      </div>
    </div>
  );
}

// Compact version for inline use
interface CompactProgressRingProps {
  progress: number;
  size?: number;
}

export function CompactProgressRing({ progress, size = 32 }: CompactProgressRingProps) {
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={2}
          fill="none"
          className="text-muted/20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#compactProgressGradient)"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.3 }}
        />
        <defs>
          <linearGradient id="compactProgressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// Speed and ETA display
interface UploadStatsProps {
  speed: number; // bytes per second
  eta: number; // seconds remaining
  uploaded: number; // bytes uploaded
  total: number; // total bytes
}

export function UploadStats({ speed, eta, uploaded, total }: UploadStatsProps) {
  const formatSpeed = (bytesPerSecond: number) => {
    if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
    if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
    return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
  };

  const formatEta = (seconds: number) => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.ceil(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="flex items-center gap-6 text-xs text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span>{formatSpeed(speed)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span>⏱</span>
        <span>ETA: {formatEta(eta)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span>📤</span>
        <span>
          {formatSize(uploaded)} / {formatSize(total)}
        </span>
      </div>
    </div>
  );
}