"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "./ui/button";
import {
  Video,
  TrendingUp,
  Home,
  ArrowLeft,
  GripVertical,
  Minimize2,
  Maximize2,
} from "@/lib/icons";
import { motion, AnimatePresence, useDragControls, PanInfo } from "motion/react";
import { useWalletAuth } from "@saywaht/auth";
import { useMounted, useIsMobile } from "@/hooks/use-mobile";
import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { getProfile } from "@zoralabs/coins-sdk";

interface PhaseNavigationProps {
  className?: string;
}

export function PhaseNavigation({ className = "" }: PhaseNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useWalletAuth();
  const isMounted = useMounted();
  const isMobile = useIsMobile();
  const { address } = useAccount();
  const { preferences, setHasCreatorCoin } = useUserPreferencesStore();

  // Interactive state management
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragControls = useDragControls();
  
  // Disable drag on mobile devices
  const isDragEnabled = !isMobile;

  // Load saved preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCollapsed = localStorage.getItem("nav-collapsed");
      const savedPosition = localStorage.getItem("nav-position");

      if (savedCollapsed) {
        setIsCollapsed(savedCollapsed === "true");
      }

      if (savedPosition) {
        try {
          setPosition(JSON.parse(savedPosition));
        } catch (e) {
          // Invalid saved position, use default
        }
      }
    }
  }, []);

  // Save preferences
  const savePreferences = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nav-collapsed", isCollapsed.toString());
      localStorage.setItem("nav-position", JSON.stringify(position));
    }
  }, [isCollapsed, position]);

  useEffect(() => {
    savePreferences();
  }, [savePreferences]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!address) return;
      if (preferences.hasCreatorCoin !== undefined) return;
      try {
        const prof = await getProfile({ identifier: address });
        const hasCreatorCoin = !!prof?.data?.profile?.creatorCoin?.address;
        if (!cancelled) setHasCreatorCoin(hasCreatorCoin);
      } catch {
        if (!cancelled) setHasCreatorCoin(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [address, preferences.hasCreatorCoin, setHasCreatorCoin]);

  if (!isMounted || !isAuthenticated || pathname === "/") {
    return null;
  }

  const phases = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/",
      description: "Landing & Profile",
      priority: 1,
    },
    {
      id: "create",
      label: "Create",
      icon: Video,
      path: "/editor",
      description: "Video Editor",
      priority: 2,
    },
    {
      id: "trade",
      label: "Trade",
      icon: TrendingUp,
      path: "/trade",
      description: "Coin Trading",
      priority: 3,
    },
  ];

  const currentPhase =
    phases.find(
      (phase) => pathname.startsWith(phase.path) && phase.path !== "/"
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

  const handleDragEnd = (event: any, info: PanInfo) => {
    setIsDragging(false);
    setPosition({
      x: position.x + info.offset.x,
      y: position.y + info.offset.y,
    });
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  const resetPosition = () => {
    setPosition({ x: 0, y: 0 });
  };

  // Enhanced positioning logic based on context
  const getBasePosition = () => {
    if (pathname === "/editor") {
      // In editor: move to top-right to avoid interfering with timeline
      return "fixed top-4 right-4 z-50";
    }
    // Default: top-center for landing and trade pages
    return "fixed top-4 left-1/2 transform -translate-x-1/2 z-50";
  };

  return (
    <AnimatePresence>
      <motion.div
        drag={isDragEnabled}
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0.1}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: 1,
          x: position.x,
          y: position.y,
        }}
        exit={{ opacity: 0, y: -20 }}
        className={`${getBasePosition()} ${className} ${isDragEnabled ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
        style={{
          x: position.x,
          y: position.y,
        }}
      >
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full px-2 py-1 shadow-lg group">
          <div className="flex items-center gap-1">
            {/* Drag Handle - Always visible on touch devices */}
            <Button
              variant="ghost"
              size="sm"
              className="h-11 w-11 p-0 rounded-full hover:bg-accent/50 transition-colors opacity-60 sm:opacity-0 sm:group-hover:opacity-60 cursor-grab active:cursor-grabbing touch-manipulation"
              onPointerDown={(e: React.PointerEvent) => dragControls.start(e)}
              title="Drag to move"
            >
              <GripVertical className="h-4 w-4" />
            </Button>

            {/* Collapse/Expand Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleCollapsed}
              className="h-11 w-11 p-0 rounded-full hover:bg-accent/50 transition-colors"
              title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
            >
              {isCollapsed ? (
                <Maximize2 className="h-4 w-4" />
              ) : (
                <Minimize2 className="h-4 w-4" />
              )}
            </Button>

            {/* Contextual Back Button - only show when needed and not collapsed */}
            {!isCollapsed && pathname !== "/" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={handleBack}
                title="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}

            {/* Phase Indicators - adaptive sizing */}
            {!isCollapsed &&
              phases.map((phase) => {
                const isActive = currentPhase.id === phase.id;
                const Icon = phase.icon;

                return (
                  <Button
                    key={phase.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation(phase.path)}
                    className={`h-11 w-11 p-0 rounded-full transition-all duration-200 touch-manipulation ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm scale-105"
                        : "hover:bg-accent/50 hover:scale-102"
                    }`}
                    title={phase.description}
                  >
                    <Icon className="h-4 w-4 mr-1" />
                    <span className="text-xs font-medium">{phase.label}</span>
                  </Button>
                );
              })}

            {/* Reset Position Button - only show when dragged, always visible on touch */}
            {(position.x !== 0 || position.y !== 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetPosition}
                className="h-11 w-11 p-0 rounded-full hover:bg-accent/50 transition-colors opacity-60 sm:opacity-0 sm:group-hover:opacity-60 touch-manipulation"
                title="Reset position"
              >
                <Home className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Simplified context indicator - only show on hover for cleaner UI */}
        {pathname === "/" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mt-2 opacity-100 group-hover:opacity-100 transition-opacity"
          >
            <div className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1 shadow-sm">
              <span className="text-xs text-muted-foreground">
                {currentPhase.description}
              </span>
            </div>
          </motion.div>
        )}
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
  const isMounted = useMounted();

  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load saved preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCollapsed = localStorage.getItem("mobile-nav-collapsed");

      if (savedCollapsed) {
        setIsCollapsed(savedCollapsed === "true");
      }
    }
  }, []);

  // Save preferences
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("mobile-nav-collapsed", isCollapsed.toString());
    }
  }, [isCollapsed]);

  if (!isMounted || !isAuthenticated || pathname === "/") {
    return null;
  }

  const phases = [
    {
      id: "home",
      label: "Home",
      icon: Home,
      path: "/",
      priority: 1,
    },
    {
      id: "create",
      label: "Create",
      icon: Video,
      path: "/editor",
      priority: 2,
    },
    {
      id: "trade",
      label: "Trade",
      icon: TrendingUp,
      path: "/trade",
      priority: 3,
    },
  ];

  const currentPhase =
    phases.find(
      (phase) => pathname.startsWith(phase.path) && phase.path !== "/"
    ) || phases[0];

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Enhanced mobile positioning - Fixed bottom nav on mobile, no drag
  const getMobileBasePosition = () => {
    if (pathname === "/editor") {
      // In editor: use side navigation to avoid timeline conflicts
      return "fixed right-4 top-1/2 transform -translate-y-1/2 z-50 md:hidden";
    }
    // Default: fixed bottom navigation with safe area padding
    return "fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 md:hidden safe-area-bottom";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={getMobileBasePosition()}
    >
      <div className="bg-background/95 backdrop-blur-sm border border-border rounded-full px-2 py-2 shadow-lg">
        <div
          className={`flex items-center gap-1 ${pathname === "/editor" ? "flex-col" : ""} ${isCollapsed ? "justify-center" : ""}`}
        >
          {/* Collapse/Expand Toggle for Mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className="h-11 w-11 p-0 rounded-full hover:bg-accent/50 transition-colors touch-manipulation"
            title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {isCollapsed ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
          </Button>

          {/* Phase Navigation Buttons */}
          {!isCollapsed &&
            phases.map((phase) => {
              const isActive = currentPhase.id === phase.id;
              const Icon = phase.icon;

              return (
                <Button
                  key={phase.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(phase.path)}
                  className={`h-11 w-11 p-0 rounded-full transition-all duration-200 touch-manipulation ${
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm scale-110"
                      : "hover:bg-accent/50 active:scale-95"
                  }`}
                  title={`${phase.label}${phase.priority ? ` (${phase.priority})` : ""}`}
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
