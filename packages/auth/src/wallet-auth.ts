"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useEffect, useState } from "@/lib/hooks-provider";

export interface WalletUser {
  address: string;
  isConnected: boolean;
  chainId?: number;
}

/**
 * Wallet-based authentication hook
 * Replaces Better Auth with simple wallet connection state
 */
export function useWalletAuth() {
  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const [user, setUser] = useState<WalletUser | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      setUser({
        address,
        isConnected,
        chainId,
      });
    } else {
      setUser(null);
    }
  }, [address, isConnected, chainId]);

  const signOut = () => {
    disconnect();
    setUser(null);
  };

  return {
    user,
    isAuthenticated: isConnected && !!address,
    isLoading: false, // Wallet connection is instant
    signOut,
  };
}

/**
 * Get a shortened version of wallet address for display
 */
export function formatWalletAddress(address: string): string {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Check if user has required permissions for certain actions
 */
export function useWalletPermissions() {
  const { user, isAuthenticated } = useWalletAuth();

  return {
    canEdit: isAuthenticated, // Anyone with a wallet can edit
    canMint: isAuthenticated, // Anyone with a wallet can mint
    canUpload: isAuthenticated, // Anyone with a wallet can upload
    walletAddress: user?.address,
  };
}
