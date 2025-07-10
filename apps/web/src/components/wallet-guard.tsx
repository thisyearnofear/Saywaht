"use client";

import { useWalletAuth } from "@opencut/auth";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Wallet, Zap, Shield, Globe } from "@/lib/icons-provider";

interface WalletGuardProps {
  children: React.ReactNode;
  requireConnection?: boolean;
  fallback?: React.ReactNode;
}

/**
 * Component that guards content behind wallet connection
 */
export function WalletGuard({
  children,
  requireConnection = true,
  fallback,
}: WalletGuardProps) {
  const { isAuthenticated } = useWalletAuth();

  if (!requireConnection || isAuthenticated) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Wallet className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Connect Your Wallet</CardTitle>
          <CardDescription>
            Connect your wallet to start creating and editing videos with
            SayWhat
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span>Instant access - no signup required</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Shield className="h-4 w-4 text-green-500" />
              <span>Your data stays private and secure</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Globe className="h-4 w-4 text-blue-500" />
              <span>Decentralized storage and coin deployment</span>
            </div>
          </div>

          <div className="flex justify-center">
            <ConnectButton />
          </div>

          <p className="text-xs text-muted-foreground text-center">
            By connecting your wallet, you agree to our terms of service and
            privacy policy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
