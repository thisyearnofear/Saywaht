"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Video, TrendingUp, Home, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useWalletAuth } from "@opencut/auth";

interface PhaseNavigationProps {
  className?: string;
}

export function PhaseNavigation({ className = "" }: PhaseNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useWalletAuth();

  // Only show for authenticated users
  if (!isAuthenticated) return null;

  // Don't show on landing page
  if (pathname === "/") return null;

  const phases = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/",
      description: "Landing & Profile",
    },
    {
      id: "create",
      label: "Create",
      icon: Video,
      path: "/editor",
      description: "Video Editor",
    },
    {
      id: "trade",
      label: "Trade",
      icon: TrendingUp,
      path: "/trade",
      description: "Coin Trading",
    },
  ];

  const currentPhase = phases.find(phase => 
    pathname.startsWith(phase.path) && phase.path !== "/"
  ) || phases[0];

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const handleBack = () => {
    if (pathname === "/editor") {
      router.push("/");
    } else if (pathname === "/trade") {
      router.push("/");
    } else {
      router.back();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}
      >
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full px-2 py-1 shadow-lg">
          <div className="flex items-center gap-1">
            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="h-8 w-8 p-0 rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            {/* Phase Indicators */}
            {phases.map((phase) => {
              const isActive = currentPhase.id === phase.id;
              const Icon = phase.icon;

              return (
                <Button
                  key={phase.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleNavigation(phase.path)}
                  className={`h-8 px-3 rounded-full transition-all duration-200 ${
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "hover:bg-accent"
                  }`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  <span className="text-xs font-medium">{phase.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Current Phase Description */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mt-2"
        >
          <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1 shadow-sm">
            <span className="text-xs text-muted-foreground">
              {currentPhase.description}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Mobile-optimized bottom navigation for smaller screens
 */
export function MobilePhaseNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useWalletAuth();

  // Only show for authenticated users
  if (!isAuthenticated) return null;

  // Don't show on landing page
  if (pathname === "/") return null;

  const phases = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/",
    },
    {
      id: "create",
      label: "Create",
      icon: Video,
      path: "/editor",
    },
    {
      id: "trade",
      label: "Trade",
      icon: TrendingUp,
      path: "/trade",
    },
  ];

  const currentPhase = phases.find(phase => 
    pathname.startsWith(phase.path) && phase.path !== "/"
  ) || phases[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 md:hidden"
    >
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full px-2 py-2 shadow-lg">
        <div className="flex items-center gap-1">
          {phases.map((phase) => {
            const isActive = currentPhase.id === phase.id;
            const Icon = phase.icon;

            return (
              <Button
                key={phase.id}
                variant="ghost"
                size="sm"
                onClick={() => router.push(phase.path)}
                className={`h-10 w-10 p-0 rounded-full transition-all duration-200 ${
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-accent"
                }`}
              >
                <Icon className="h-5 w-5" />
              </Button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
