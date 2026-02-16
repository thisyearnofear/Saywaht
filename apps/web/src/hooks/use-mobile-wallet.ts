"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";

interface MobileWalletState {
  isConnecting: boolean;
  isMetaMaskMobile: boolean;
  connectionError: string | null;
  retryConnection: () => void;
}

/**
 * Hook to handle mobile wallet connections with better UX
 * Specifically handles MetaMask Mobile quirks and deeplinking
 */
export function useMobileWallet(): MobileWalletState {
  const { isConnecting: isWagmiConnecting } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isMetaMaskMobile, setIsMetaMaskMobile] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Detect if user is on MetaMask Mobile browser
  useEffect(() => {
    if (typeof window === "undefined") return;

    const userAgent = navigator.userAgent.toLowerCase();
    const isMetaMaskBrowser = userAgent.includes("metamask") || 
      (window.ethereum && (window.ethereum as any).isMetaMask);
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent
    );

    setIsMetaMaskMobile(isMetaMaskBrowser && isMobile);
  }, []);

  // Handle connection with retry logic
  const retryConnection = useCallback(() => {
    setConnectionError(null);
    setIsConnecting(true);

    // Find MetaMask connector
    const metaMaskConnector = connectors.find(
      (c) => c.id === "metaMask" || c.name?.toLowerCase().includes("metamask")
    );

    if (metaMaskConnector) {
      connect(
        { connector: metaMaskConnector },
        {
          onError: (error) => {
            console.error("MetaMask connection error:", error);
            setConnectionError(
              "Failed to connect to MetaMask. Please make sure the app is installed and try again."
            );
            setIsConnecting(false);
          },
          onSuccess: () => {
            setIsConnecting(false);
            setConnectionError(null);
          },
        }
      );
    } else {
      setConnectionError("MetaMask connector not found. Please try another wallet.");
      setIsConnecting(false);
    }
  }, [connect, connectors]);

  // Sync with wagmi's connecting state
  useEffect(() => {
    setIsConnecting(isWagmiConnecting);
  }, [isWagmiConnecting]);

  return {
    isConnecting,
    isMetaMaskMobile,
    connectionError,
    retryConnection,
  };
}

/**
 * Check if the app is running inside a mobile wallet browser
 */
export function useIsWalletBrowser(): boolean {
  const [isWalletBrowser, setIsWalletBrowser] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkWalletBrowser = () => {
      const ethereum = window.ethereum as any;
      if (!ethereum) return false;

      // Check for various wallet providers
      return !!(
        ethereum.isMetaMask ||
        ethereum.isCoinbaseWallet ||
        ethereum.isTrust ||
        ethereum.isRainbow ||
        ethereum.isBraveWallet ||
        ethereum.isPhantom
      );
    };

    setIsWalletBrowser(checkWalletBrowser());
  }, []);

  return isWalletBrowser;
}

/**
 * Hook to handle deeplink redirection for mobile wallets
 */
export function useWalletDeeplink(): {
  openMetaMask: (url?: string) => void;
  openCoinbaseWallet: (url?: string) => void;
  openTrustWallet: (url?: string) => void;
} {
  const openMetaMask = useCallback((url?: string) => {
    if (typeof window === "undefined") return;
    
    const currentUrl = url || window.location.href;
    const metamaskDeeplink = `https://metamask.app.link/dapp/${currentUrl.replace(/^https?:\/\//, "")}`;
    
    // Try to open MetaMask app
    window.location.href = metamaskDeeplink;
    
    // Fallback: if MetaMask isn't installed, redirect to app store after delay
    setTimeout(() => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const appStoreUrl = isIOS
        ? "https://apps.apple.com/us/app/metamask-blockchain-wallet/id1438144202"
        : "https://play.google.com/store/apps/details?id=io.metamask";
      
      // Only redirect if still on the same page (MetaMask didn't open)
      if (document.hidden) return;
      window.location.href = appStoreUrl;
    }, 2000);
  }, []);

  const openCoinbaseWallet = useCallback((url?: string) => {
    if (typeof window === "undefined") return;
    
    const currentUrl = url || window.location.href;
    const cbDeeplink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(currentUrl)}`;
    
    window.location.href = cbDeeplink;
  }, []);

  const openTrustWallet = useCallback((url?: string) => {
    if (typeof window === "undefined") return;
    
    const currentUrl = url || window.location.href;
    const trustDeeplink = `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(currentUrl)}`;
    
    window.location.href = trustDeeplink;
  }, []);

  return {
    openMetaMask,
    openCoinbaseWallet,
    openTrustWallet,
  };
}
