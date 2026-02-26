"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface FarcasterSplashScreenProps {
  isVisible: boolean;
  onComplete: () => void;
  className?: string;
}

/**
 * Farcaster Mini App Splash Screen
 * Matches the native Farcaster splash (black bg) for a seamless transition.
 * Shows a minimal branded screen, then calls onComplete after a short
 * minimum duration (to avoid jarring flashes if SDK inits instantly).
 */
export function FarcasterSplashScreen({
  isVisible,
  onComplete,
  className,
}: FarcasterSplashScreenProps) {
  const hasCompleted = useRef(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Minimum display time so the splash doesn't flash for 0ms
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeElapsed(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // Safety: force-complete after 2s max
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasCompleted.current) {
        hasCompleted.current = true;
        onComplete();
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  // Complete once minimum time has elapsed (SDK may already be ready)
  useEffect(() => {
    if (minTimeElapsed && !hasCompleted.current) {
      hasCompleted.current = true;
      onComplete();
    }
  }, [minTimeElapsed, onComplete]);

  if (hasCompleted.current && !isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center",
        "transition-opacity duration-500 ease-out",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
      style={{ backgroundColor: "#000" }}
    >
      {/* Subtle gradient — matches Farcaster aesthetic */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/15 via-transparent to-blue-600/10 pointer-events-none" />

      <div className="relative flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="relative">
          <div className="w-20 h-20 rounded-[1.25rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
            <span className="text-3xl font-black text-white italic">W</span>
          </div>
          <div className="absolute inset-0 rounded-[1.25rem] border border-white/10 animate-pulse" />
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tighter italic">
            saywaht
          </h1>
          <p className="text-xs text-white/40 font-bold uppercase tracking-widest">
            Coin Your Commentary
          </p>
        </div>

        {/* Minimal loading indicator */}
        <div className="flex items-center gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
