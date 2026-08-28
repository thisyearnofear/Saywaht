"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Check,
  X,
  Zap,
  Share2,
  ExternalLink,
  Shield,
  Clock,
  CheckCircle
} from "@/lib/icons";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { getProfile, getCoinCreateFromLogs } from "@zoralabs/coins-sdk";

import { MintWizardData } from "../mint-wizard";
import { base } from "viem/chains";
import { PLATFORM_ADDRESS } from "@/lib";
import { triggerCoinCelebration } from "@/lib/confetti";
import { getZoraCoins } from "@/lib/zora-coins";
import { invalidateCoinsCache } from "@/lib/coins-cache";
import { assertBackendHealthy } from "@/lib/backend-health";
import { useFarcasterContext } from "@/farcaster/components/farcaster-provider";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { cn } from "@/lib/utils";
import { useMissionStore } from "@/services/mission-service";

interface DeployStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

const BACKEND_EXPORT_URL =
  process.env.NEXT_PUBLIC_BACKEND_EXPORT_URL || "https://persidian.com";
const COIN_CALLDATA_RETRY_DELAYS_MS = [0, 4000, 9000];
const BASE_APPENDED_DATA_SUFFIX = "07626173656170700080218021802180218021802180218021";

type CoinCall = {
  to?: string;
  data?: string;
  value?: string | number | bigint;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableCoinCalldataError(message: string) {
  const normalized = message.toLowerCase();

  return [
    "metadata fetch failed",
    "timed out",
    "timeout",
    "fetch failed",
    "failed to fetch",
    "502",
    "503",
    "504",
  ].some((fragment) => normalized.includes(fragment));
}

async function requestCoinCalldata(contractCallParams: any) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < COIN_CALLDATA_RETRY_DELAYS_MS.length; attempt++) {
    const delayMs = COIN_CALLDATA_RETRY_DELAYS_MS[attempt];

    if (delayMs > 0) {
      console.warn(`Retrying coin calldata request after ${delayMs}ms...`);
      await sleep(delayMs);
    }

    try {
      const response = await fetch(`${BACKEND_EXPORT_URL}/api/zora/create-coin-calldata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contractCallParams),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }

        throw new Error(errorData.error || `Failed to get coin calldata (${response.status})`);
      }

      return response.json();
    } catch (error) {
      const resolvedError =
        error instanceof Error ? error : new Error("Failed to request coin calldata");

      lastError = resolvedError;

      if (
        attempt === COIN_CALLDATA_RETRY_DELAYS_MS.length - 1 ||
        !isRetryableCoinCalldataError(resolvedError.message)
      ) {
        throw resolvedError;
      }
    }
  }

  throw lastError || new Error("Failed to request coin calldata");
}

function normalizeCoinCalldataResponse(responseData: any): {
  calls: CoinCall[];
  predictedCoinAddress?: string;
} {
  const rawCalls =
    (Array.isArray(responseData?.calls) && responseData.calls) ||
    (Array.isArray(responseData?.transactions) && responseData.transactions) ||
    (Array.isArray(responseData?.txs) && responseData.txs) ||
    (Array.isArray(responseData) && responseData) ||
    (responseData?.call ? [responseData.call] : null);

  const calls = Array.isArray(rawCalls)
    ? rawCalls
        .flatMap((entry) => {
          const normalizedEntry = entry?.call || entry?.tx || entry;
          if (Array.isArray(normalizedEntry?.calls)) {
            return normalizedEntry.calls;
          }
          return normalizedEntry ? [normalizedEntry] : [];
        })
        .filter(Boolean)
    : [];

  return {
    calls,
    predictedCoinAddress:
      responseData?.predictedCoinAddress || responseData?.coinAddress,
  };
}

function withBaseAppendedDataSuffix(data: string) {
  return data.endsWith(BASE_APPENDED_DATA_SUFFIX)
    ? data
    : `${data}${BASE_APPENDED_DATA_SUFFIX}`;
}

export function DeployStep({ data, updateData }: DeployStepProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { preferences, setHasCreatorCoin } = useUserPreferencesStore();
  const { incrementCommentaryCount, completeMission } = useMissionStore();
  const { isFarcasterMiniApp } = useFarcasterContext();

  const [contractCallParams, setContractCallParams] = useState<any>(null);
  const { data: walletClient } = useWalletClient();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (
      !address ||
      !data.metadataUri ||
      data.isDeploying ||
      data.deployedCoin ||
      contractCallParams
    )
      return;

    const prepareCall = async () => {
      try {
        const selectedCurrency = data.currency || "ZORA";

        const coinArgs: any = {
          creator: address,
          name: data.coinName,
          symbol: data.coinSymbol,
          metadata: { type: "RAW_URI", uri: data.metadataUri },
          currency: selectedCurrency,
          chainId: base.id,
          platformReferrer: PLATFORM_ADDRESS,
          payoutRecipientOverride: address,
          skipMetadataValidation: true,
        };

        setContractCallParams(coinArgs);
      } catch (err) {
        console.error("Failed to prepare coin creation:", err);
        toast.error("Failed to prepare coin creation");
        updateData({ isDeploying: false });
      }
    };

    prepareCall();
  }, [
    address,
    data.metadataUri,
    data.isDeploying,
    data.deployedCoin,
    data.coinName,
    data.coinSymbol,
    data.currency,
    contractCallParams,
    updateData,
  ]);

  useEffect(() => {
    if (!contractCallParams || data.isDeploying || data.deployedCoin) return;
    if (!walletClient || !publicClient) return;

    const deployNow = async () => {
      updateData({ isDeploying: true });
      setStatus("pending");

      try {
        await assertBackendHealthy();
        const responseData = await requestCoinCalldata(contractCallParams);
        const { calls, predictedCoinAddress } =
          normalizeCoinCalldataResponse(responseData);
        const firstCall = calls[0];

        if (!firstCall?.to || typeof firstCall.to !== "string") {
          throw new Error("Invalid coin calldata response: missing transaction target");
        }

        if (!firstCall?.data || typeof firstCall.data !== "string") {
          throw new Error("Invalid coin calldata response: missing transaction data");
        }

        const hash = await walletClient.sendTransaction({
          to: firstCall.to as `0x${string}`,
          data: withBaseAppendedDataSuffix(firstCall.data) as `0x${string}`,
          value: firstCall.value ? BigInt(firstCall.value) : undefined,
          account: address as `0x${string}`,
          chain: publicClient.chain,
        });

        setTxHash(hash);
        setIsConfirming(true);

        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        setIsSuccess(true);
        setIsConfirming(false);

        let coinAddress: string | undefined;
        try {
          const creationInfo = getCoinCreateFromLogs(receipt);
          coinAddress = creationInfo?.coin;
        } catch (logErr) { }

        if (!coinAddress && predictedCoinAddress) {
          coinAddress = predictedCoinAddress;
        }

        await triggerCoinCelebration();
        toast.success("Coin deployed! 🎉");

        updateData({
          deployedCoin: {
            name: data.coinName,
            symbol: data.coinSymbol,
            address: coinAddress || undefined,
          },
          isDeploying: false,
        });

        if (coinAddress) {
          fetch(`${BACKEND_EXPORT_URL}/api/coins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              address: coinAddress,
              name: data.coinName,
              symbol: data.coinSymbol,
              creatorAddress: address,
              txHash: hash,
              metadataUri: data.metadataUri || undefined,
              thumbnailUrl: data.thumbnail || undefined,
            }),
          })
            .then(() => {
              // Bust the coins cache so discovery/trading feeds show the new coin
              invalidateCoinsCache();
            })
            .catch(() => { });
        }

        setStatus("idle");
      } catch (err) {
        console.error("Deploy failed:", err);
        const msg = err instanceof Error ? err.message : "Something went wrong. Please check your wallet and try again.";
        setErrorMessage(msg);
        setStatus("error");
        updateData({ isDeploying: false });
        toast.error(msg);
      }
    };

    deployNow();
  }, [
    contractCallParams,
    walletClient,
    publicClient,
    data.isDeploying,
    data.deployedCoin,
    data.coinName,
    data.coinSymbol,
    data.metadataUri,
    data.thumbnail,
    address,
    updateData,
  ]);

  const getStatusContent = () => {
    if (data.deployedCoin) {
      return {
        icon: <Check className="w-8 h-8 text-white" />,
        title: "Launched Successfully!",
        description: "Your coin is now live on the Base blockchain.",
        color: "bg-green-500 shadow-green-500/20",
        label: "Success",
        labelColor: "text-green-500 bg-green-500/10"
      };
    }

    if (status === "error") {
      return {
        icon: <X className="w-8 h-8 text-white" />,
        title: "Deployment Error",
        description: errorMessage || "Something went wrong. Please check your wallet and try again.",
        color: "bg-destructive shadow-destructive/20",
        label: "Error",
        labelColor: "text-destructive bg-destructive/10"
      };
    }

    if (isConfirming) {
      return {
        icon: <Loader2 className="w-8 h-8 text-white animate-spin" />,
        title: "Confirming Transaction",
        description: "Verifying your coin on the blockchain network...",
        color: "bg-primary shadow-primary/20",
        label: "Confirming",
        labelColor: "text-primary bg-primary/10"
      };
    }

    return {
      icon: <Loader2 className="w-8 h-8 text-white animate-spin" />,
      title: "Broadcasting to Network",
      description: "Please confirm the transaction in your wallet.",
      color: "bg-primary shadow-primary/20",
      label: "Processing",
      labelColor: "text-primary bg-primary/10"
    };
  };

  const content = getStatusContent();

  return (
    <div className="space-y-8 animate-fade-in max-w-md mx-auto">
      <div className="flex flex-col items-center text-center space-y-6">
        <Badge className={cn("rounded-full border-none font-black tracking-widest uppercase text-[10px]", content.labelColor)}>
          {content.label}
        </Badge>

        <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500", content.color)}>
          {content.icon}
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black tracking-tight">{content.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed px-4">
            {content.description}
          </p>
        </div>

        {txHash && (
          <div className="glass rounded-2xl p-3 border-border/40 group">
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-black uppercase text-muted-foreground">TX Hash</div>
              <code className="text-[10px] font-mono opacity-60 group-hover:opacity-100 transition-opacity">
                {txHash.slice(0, 12)}...{txHash.slice(-8)}
              </code>
            </div>
          </div>
        )}

        {/* Progress List */}
        <div className="w-full space-y-4 pt-4">
          {[
            { label: "IPFS Metadata Upload", done: !!data.metadataUri },
            { label: "Network Broadcast", done: status === "pending" || isConfirming || isSuccess },
            { label: "Blockchain Verification", done: isSuccess }
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-4 group">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500",
                step.done ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
              )}>
                {step.done ? <Check className="h-3 w-3" strokeWidth={3} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />}
              </div>
              <span className={cn(
                "text-sm font-bold transition-all duration-500",
                step.done ? "text-foreground" : "text-muted-foreground opacity-50"
              )}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-6 border-border/40 w-full space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Secure Launch</span>
          </div>
          <p className="text-[11px] text-muted-foreground text-left leading-relaxed">
            Your coin uses the Zora Protocol v2 on Base. This ensures decentralized ownership, 24/7 liquidity, and seamless trading for your community.
          </p>
        </div>
      </div>
    </div>
  );
}
