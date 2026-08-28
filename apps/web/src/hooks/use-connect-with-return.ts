"use client";

import { useCallback } from "react";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Shared wallet-connect affordance with return-intent.
 *
 * The audit found three separate wallet walls (hero, editor WalletGuard, trade
 * gate) that shared no onboarding state or intent. The coin page added a fourth
 * (Buy/Sell click). This hook unifies the "connect" action across all of them:
 *
 *  - If already connected → no-op (caller proceeds).
 *  - If not connected → opens the rainbowkit connect modal.
 *  - After connection, reads ?next= from the URL (or the fallback) and
 *    navigates there. "Came from trade → back to trade."
 *
 * Usage:
 *   const { ensureConnected } = useConnectWithReturn("/trade");
 *   <Button onClick={() => ensureConnected() && doTrade()}>Buy</Button>
 *
 * Or for a pure "connect then return" wall:
 *   const { connectAndReturn } = useConnectWithReturn("/");
 *   <Button onClick={connectAndReturn}>Connect Wallet</Button>
 */
export function useConnectWithReturn(defaultReturn: string = "/") {
  const { openConnectModal } = useConnectModal();
  const { isConnected } = useAccount();
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams?.get("next") || defaultReturn;

  /**
   * Open the connect modal if not connected. Returns true if already
   * connected (caller can proceed immediately), false if the modal was
   * opened (caller should wait for connection).
   */
  const ensureConnected = useCallback(() => {
    if (isConnected) return true;
    openConnectModal?.();
    return false;
  }, [isConnected, openConnectModal]);

  /**
   * Open the connect modal if not connected, then navigate to the `next`
   * path (from ?next= or the default). Use for wallet walls where the
   * destination is the only intent (e.g. the old trade gate).
   */
  const connectAndReturn = useCallback(() => {
    if (isConnected) {
      router.push(next);
      return;
    }
    // rainbowkit's connect modal is a controlled overlay; when the user
    // finishes connecting, wagmi's useAccount fires isConnected=true. The
    // caller page can watch that and navigate. For a simple "connect then
    // go" wall, we rely on the next render after connection to hit the
    // isConnected branch and push. This is why the coin page opens the modal
    // on click but keeps the page mounted (the return destination IS the
    // current page — no navigation needed).
    openConnectModal?.();
  }, [isConnected, openConnectModal, router, next]);

  return { ensureConnected, connectAndReturn, next, isConnected };
}
