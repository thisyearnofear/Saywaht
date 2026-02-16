"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useMobileWallet, useWalletDeeplink } from "@/hooks/use-mobile-wallet";
import { useIsMobile } from "@/hooks/use-mobile";
import { Wallet, Smartphone, ArrowRight, ExternalLink, RefreshCw } from "@/lib/icons";

interface MobileWalletConnectProps {
  variant?: "default" | "hero" | "minimal";
}

/**
 * Mobile-optimized wallet connection component
 * Provides better UX for mobile users trying to connect wallets
 */
export function MobileWalletConnect({ variant = "default" }: MobileWalletConnectProps) {
  const isMobile = useIsMobile();
  const { isConnecting, connectionError, retryConnection } = useMobileWallet();
  const { openMetaMask, openCoinbaseWallet, openTrustWallet } = useWalletDeeplink();
  const [showMobileOptions, setShowMobileOptions] = useState(false);
  const [isInWalletBrowser, setIsInWalletBrowser] = useState(false);

  // Check if already in a wallet browser
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const ethereum = (window as any).ethereum;
    setIsInWalletBrowser(!!ethereum);
  }, []);

  // If not mobile or already in wallet browser, use standard RainbowKit button
  if (!isMobile || isInWalletBrowser) {
    return <ConnectButton />;
  }

  // Mobile-specific UI
  return (
    <>
      <div className="flex flex-col items-center gap-3">
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const ready = mounted;
            const connected = ready && account && chain;

            return (
              <div
                {...(!ready && {
                  "aria-hidden": true,
                  style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                  },
                })}
              >
                {(() => {
                  if (!connected) {
                    return (
                      <div className="flex flex-col items-center gap-3">
                        <Button
                          onClick={() => setShowMobileOptions(true)}
                          size={variant === "hero" ? "lg" : "default"}
                          className={variant === "hero" ? "px-8 h-12 text-base" : ""}
                        >
                          <Wallet className="mr-2 h-4 w-4" />
                          Connect Wallet
                        </Button>
                        {connectionError && (
                          <div className="text-center">
                            <p className="text-xs text-destructive mb-2">{connectionError}</p>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={retryConnection}
                              disabled={isConnecting}
                            >
                              <RefreshCw className={`mr-1 h-3 w-3 ${isConnecting ? "animate-spin" : ""}`} />
                              Retry
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (chain.unsupported) {
                    return (
                      <Button onClick={openChainModal} variant="destructive">
                        Wrong network
                      </Button>
                    );
                  }

                  return (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={openChainModal}
                        size="sm"
                        variant="outline"
                        className="hidden sm:flex"
                      >
                        {chain.hasIcon && (
                          <div
                            style={{
                              background: chain.iconBackground,
                              width: 12,
                              height: 12,
                              borderRadius: 999,
                              overflow: "hidden",
                              marginRight: 4,
                            }}
                          >
                            {chain.iconUrl && (
                              <img
                                alt={chain.name ?? "Chain icon"}
                                src={chain.iconUrl}
                                style={{ width: 12, height: 12 }}
                              />
                            )}
                          </div>
                        )}
                        {chain.name}
                      </Button>

                      <Button onClick={openAccountModal} size="sm" variant="outline">
                        {account.displayName}
                        {account.displayBalance
                          ? ` (${account.displayBalance})`
                          : ""}
                      </Button>
                    </div>
                  );
                })()}
              </div>
            );
          }}
        </ConnectButton.Custom>
      </div>

      {/* Mobile Wallet Options Dialog */}
      <Dialog open={showMobileOptions} onOpenChange={setShowMobileOptions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Connect Mobile Wallet
            </DialogTitle>
            <DialogDescription>
              Choose your preferred wallet to connect
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 mt-4">
            {/* MetaMask Option */}
            <Button
              variant="outline"
              className="justify-between h-auto py-4 px-4"
              onClick={() => {
                setShowMobileOptions(false);
                openMetaMask();
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold text-sm">
                  MM
                </div>
                <div className="text-left">
                  <p className="font-medium">MetaMask</p>
                  <p className="text-xs text-muted-foreground">Popular mobile wallet</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            {/* Coinbase Wallet Option */}
            <Button
              variant="outline"
              className="justify-between h-auto py-4 px-4"
              onClick={() => {
                setShowMobileOptions(false);
                openCoinbaseWallet();
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-sm">
                  CB
                </div>
                <div className="text-left">
                  <p className="font-medium">Coinbase Wallet</p>
                  <p className="text-xs text-muted-foreground">Easy to use</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            {/* Trust Wallet Option */}
            <Button
              variant="outline"
              className="justify-between h-auto py-4 px-4"
              onClick={() => {
                setShowMobileOptions(false);
                openTrustWallet();
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center text-blue-600 font-bold text-sm">
                  TW
                </div>
                <div className="text-left">
                  <p className="font-medium">Trust Wallet</p>
                  <p className="text-xs text-muted-foreground">Multi-chain support</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or
                </span>
              </div>
            </div>

            {/* Standard WalletConnect Option */}
            <Button
              variant="secondary"
              className="justify-between h-auto py-4 px-4"
              onClick={() => {
                setShowMobileOptions(false);
                // Let RainbowKit handle this
                setTimeout(() => {
                  const connectBtn = document.querySelector("[data-testid='rk-connect-button']") as HTMLButtonElement;
                  connectBtn?.click();
                }, 100);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Other Wallets</p>
                  <p className="text-xs text-muted-foreground">WalletConnect compatible</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Button>

            <p className="text-xs text-muted-foreground text-center mt-2">
              Don&apos;t have a wallet?{" "}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Get MetaMask
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Simple mobile wallet button for use in headers/navbars
 */
export function MobileWalletButton() {
  const isMobile = useIsMobile();
  const [showOptions, setShowOptions] = useState(false);
  const { openMetaMask, openCoinbaseWallet } = useWalletDeeplink();

  if (!isMobile) {
    return <ConnectButton />;
  }

  return (
    <>
      <ConnectButton.Custom>
        {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          if (!connected) {
            return (
              <Button onClick={() => setShowOptions(true)} size="sm">
                <Wallet className="mr-2 h-4 w-4" />
                Connect
              </Button>
            );
          }

          if (chain.unsupported) {
            return (
              <Button onClick={openChainModal} variant="destructive" size="sm">
                Wrong network
              </Button>
            );
          }

          return (
            <Button onClick={openAccountModal} size="sm" variant="outline">
              {account.displayName}
            </Button>
          );
        }}
      </ConnectButton.Custom>

      {/* Simplified Mobile Options */}
      <Dialog open={showOptions} onOpenChange={setShowOptions}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Connect Wallet</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            <Button onClick={() => { setShowOptions(false); openMetaMask(); }}>
              MetaMask
            </Button>
            <Button onClick={() => { setShowOptions(false); openCoinbaseWallet(); }} variant="outline">
              Coinbase Wallet
            </Button>
            <Button 
              onClick={() => { 
                setShowOptions(false); 
                setTimeout(() => {
                  const btn = document.querySelector("[data-testid='rk-connect-button']") as HTMLButtonElement;
                  btn?.click();
                }, 100);
              }} 
              variant="ghost"
            >
              More Options...
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
