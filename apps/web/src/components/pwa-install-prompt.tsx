"use client";

import { useState, useEffect } from "@/lib/hooks-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Download,
  X,
  Smartphone,
  Monitor,
  Wifi,
  WifiOff,
} from "@/lib/icons-provider";
import { usePWA } from "@/hooks/use-pwa";
import { cn } from "@/lib/utils";

interface PWAInstallPromptProps {
  className?: string;
}

export function PWAInstallPrompt({ className }: PWAInstallPromptProps) {
  const { isInstallable, isInstalled, isOnline, installApp } = usePWA();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Show prompt after a delay if app is installable
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // Show after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const success = await installApp();
      if (success) {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("Installation failed:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem("pwa-prompt-dismissed", "true");
  };

  // Don't show if already installed or dismissed
  if (isInstalled || !isInstallable || !showPrompt) {
    return null;
  }

  // Don't show if previously dismissed in this session
  if (sessionStorage.getItem("pwa-prompt-dismissed")) {
    return null;
  }

  return (
    <Card
      className={cn(
        "fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm shadow-lg border-primary/20",
        "animate-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle className="text-sm">Install SayWhat</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <CardDescription className="text-xs mb-3">
          Install SayWhat for a better experience with offline access and faster
          loading.
        </CardDescription>

        <div className="flex items-center gap-2 mb-3">
          <div
            className={cn(badgeVariants({ variant: "secondary" }), "text-xs")}
          >
            <Monitor className="h-3 w-3 mr-1" />
            No App Store
          </div>
          <div
            className={cn(badgeVariants({ variant: "secondary" }), "text-xs")}
          >
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Offline Ready
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleInstall}
            disabled={isInstalling}
            className="flex-1 h-8 text-xs"
          >
            {isInstalling ? (
              <>
                <div className="h-3 w-3 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Installing...
              </>
            ) : (
              <>
                <Download className="h-3 w-3 mr-2" />
                Install
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            className="h-8 text-xs"
          >
            Not Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Mini status indicator for PWA status
export function PWAStatus() {
  const { isInstalled, isOnline } = usePWA();

  if (!isInstalled) return null;

  return (
    <div className="flex items-center gap-1">
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          isOnline ? "bg-green-500" : "bg-yellow-500"
        )}
      />
      <span className="text-xs text-muted-foreground">
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
}
