"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LuLoader as Loader2, LuCheck, LuX } from "react-icons/lu";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { toast } from "sonner";
import { getProfile, getCoinCreateFromLogs } from "@zoralabs/coins-sdk";

import { MintWizardData } from "../mint-wizard";
import { base } from "viem/chains";
// Using CreateCoinArgs and CreateConstants via namespace import
import { PLATFORM_ADDRESS } from "@/lib";
import { triggerCoinCelebration } from "@/lib/confetti";
import { getZoraCoins } from "@/lib/zora-coins";
import { sdk } from "@farcaster/miniapp-sdk";
import {
  hapticSelection,
  hapticImpact,
  hapticNotify,
} from "@/farcaster/utils/frame-utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";

interface DeployStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

export function DeployStep({ data, updateData }: DeployStepProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { preferences, setHasCreatorCoin } = useUserPreferencesStore();

  // Prepare contract call parameters
  const [contractCallParams, setContractCallParams] = useState<any>(null);
  const [backingInfo, setBackingInfo] = useState<{
    label: string;
    creatorBacked: boolean;
  } | null>(null);

  const { data: walletClient } = useWalletClient();
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");

  // Prepare the contract call when component mounts
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
        console.log("🪙 Preparing coin creation on Zora Protocol...");

        // Validate metadata URI with improved propagation handling
        console.log("🔍 Validating metadata URI content...");
        if (!data.metadataUri) {
          toast.error("Metadata URI is required");
          updateData({ isDeploying: false });
          return;
        }

        try {
          const isValid = await getZoraCoins().validateMetadataURI(data.metadataUri);
          if (isValid) {
            console.log("✅ Metadata validation passed");
          } else {
            console.warn("⚠️ Metadata validation uncertain, proceeding anyway");
          }
        } catch (validationError) {
          // Don't block deployment on validation errors
          console.warn("⚠️ Metadata validation error, proceeding anyway:", validationError);
        }

        // Use the currency selected by the user in the currency selection step
        const selectedCurrency = data.currency || "ZORA";

        // Still check for creator coin to show info, but use user's selection
        let hasCreatorCoin = false;

        if (preferences.hasCreatorCoin !== undefined) {
          hasCreatorCoin = !!preferences.hasCreatorCoin;
          setBackingInfo({
            label: selectedCurrency === "CREATOR_COIN" ? "Creator Coin" : selectedCurrency,
            creatorBacked: selectedCurrency === "CREATOR_COIN",
          });
        } else {
          try {
            const prof = await getProfile({ identifier: address });
            hasCreatorCoin = !!prof?.data?.profile?.creatorCoin?.address;
            setHasCreatorCoin(hasCreatorCoin);
            setBackingInfo({
              label: selectedCurrency === "CREATOR_COIN" ? "Creator Coin" : selectedCurrency,
              creatorBacked: selectedCurrency === "CREATOR_COIN",
            });
          } catch {
            setHasCreatorCoin(false);
            setBackingInfo({ label: selectedCurrency, creatorBacked: false });
          }
        }

        // Prepare CreateCoinArgs for SDK v0.3.x
        const coinArgs: any = {
          creator: address,
          name: data.coinName,
          symbol: data.coinSymbol,
          metadata: { type: "RAW_URI", uri: data.metadataUri },
          currency: selectedCurrency,
          chainId: base.id,
          platformReferrer: PLATFORM_ADDRESS,
          payoutRecipientOverride: address,
        };

        setContractCallParams(coinArgs);
      } catch (err) {
        console.error("Failed to prepare coin creation:", err);
        toast.error("Failed to prepare coin creation");
        updateData({ isDeploying: false });
      }
    };

    prepareCall();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    address,
    data.metadataUri,
    data.isDeploying,
    data.deployedCoin,
    data.coinName,
    data.coinSymbol,
    contractCallParams,
    // updateData is intentionally excluded to prevent infinite loop
  ]);

  // Auto-deploy when coin args are ready
  useEffect(() => {
    if (!contractCallParams || data.isDeploying || data.deployedCoin) return;
    if (!walletClient || !publicClient) return;

    const deployNow = async () => {
      updateData({ isDeploying: true });
      setStatus("pending");

      try {
        console.log("🚀 Getting coin calldata from server...");

        // Call our API route to get calldata (keeps API key server-side)
        const response = await fetch("/api/zora/create-coin-calldata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contractCallParams),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to get coin calldata");
        }

        const responseData = await response.json();
        console.log("📦 Received response from server:", responseData);

        const { calls, predictedCoinAddress } = responseData;

        // Validate that we have the required data
        if (!calls || !Array.isArray(calls) || calls.length === 0) {
          console.error("❌ Invalid response: missing or empty calls array", responseData);
          throw new Error("Invalid response from server: missing transaction calls");
        }

        if (!calls[0].to || !calls[0].data) {
          console.error("❌ Invalid call data:", calls[0]);
          throw new Error("Invalid transaction call data");
        }

        console.log("🚀 Deploying coin via wallet...");
        
        // Improvement 3: Pre-flight Balance & Gas Check
        try {
          const userBalance = await publicClient.getBalance({ address: address as `0x${string}` });
          const requiredValue = calls[0].value ? BigInt(calls[0].value) : BigInt(0);
          const estimatedGasBuffer = BigInt(1000000000000000); // 0.001 ETH buffer for gas
          
          if (userBalance < (requiredValue + estimatedGasBuffer)) {
            const needed = (requiredValue + estimatedGasBuffer) - userBalance;
            const neededEth = Number(needed) / 1e18;
            throw new Error(`Insufficient balance on Base. You need approximately ${neededEth.toFixed(4)} more ETH to cover the pool creation and gas.`);
          }
        } catch (balanceErr) {
          console.warn("⚠️ Balance check failed or insufficient:", balanceErr);
          if (balanceErr instanceof Error && balanceErr.message.includes("Insufficient balance")) {
            throw balanceErr;
          }
          // Continue if it's just a RPC failure
        }

        console.log("📝 Transaction details:", {
          to: calls[0].to,
          data: calls[0].data?.substring(0, 66) + "...",
          value: calls[0].value,
        });

        // Send the transaction using the calldata from our server
        // Convert value back to BigInt (serialized as string from API)
        const hash = await walletClient.sendTransaction({
          to: calls[0].to,
          data: calls[0].data,
          value: calls[0].value ? BigInt(calls[0].value) : undefined,
          account: walletClient.account,
          chain: publicClient.chain,
        });

        setTxHash(hash);

        // Wait for transaction confirmation
        console.log("⏳ Waiting for transaction confirmation...");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });

        setIsSuccess(true);
        setIsConfirming(false);

        // Extract coin address from logs since it's no longer predicted
        let coinAddress: string | undefined;
        try {
          const creationInfo = getCoinCreateFromLogs(receipt);
          coinAddress = creationInfo?.coin;
        } catch (logErr) {
          console.warn("⚠️ Failed to extract coin address from logs:", logErr);
        }

        // Use predicted address as fallback if extraction failed
        if (!coinAddress && predictedCoinAddress) {
          console.log("ℹ️ Using predicted address as fallback:", predictedCoinAddress);
          coinAddress = predictedCoinAddress;
        }

        console.log("🪙 Coin deployed successfully!");
        if (coinAddress) {
          console.log("📍 Coin address:", coinAddress);
        }

        // Trigger celebration confetti
        triggerCoinCelebration();

        toast.dismiss();
        toast.success("Content coin created successfully! 🎉");
        updateData({
          deployedCoin: {
            name: data.coinName,
            symbol: data.coinSymbol,
            address: coinAddress || undefined,
          },
          isDeploying: false,
        });

        // Register coin with platform (non-blocking)
        if (coinAddress) {
          fetch('/api/coins', {
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
          }).catch(() => {});
        }

        setStatus("idle");
      } catch (err) {
        console.error("Deploy failed:", err);
        setStatus("error");
        if (err instanceof Error) {
          if (
            err.message.includes("User denied") ||
            err.message.includes("user rejected")
          ) {
            toast.error("Transaction cancelled by user");
          } else if (err.message.includes("insufficient funds")) {
            toast.error("Insufficient funds to complete transaction");
          } else if (err.message.includes("network")) {
            toast.error(
              "Network error. Please check your connection and try again"
            );
          } else {
            toast.error(err.message);
          }
        } else {
          toast.error("Transaction failed. Please try again");
        }
        updateData({ isDeploying: false });
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
    updateData,
  ]);

  const getStatusInfo = () => {
    if (data.deployedCoin) {
      return {
        icon: (
          <div className="w-6 h-6 text-green-500">
            <LuCheck />
          </div>
        ),
        title: "Deployment Complete!",
        description:
          "Your coin has been successfully deployed to the blockchain",
        color: "text-green-600",
      };
    }

    if (status === "error") {
      return {
        icon: (
          <div className="w-6 h-6 text-red-500">
            <LuX />
          </div>
        ),
        title: "Deployment Failed",
        description:
          "There was an error deploying your coin. Please try again.",
        color: "text-red-600",
      };
    }

    if (isConfirming) {
      return {
        icon: (
          <div className="w-6 h-6 animate-spin text-blue-500">
            <Loader2 />
          </div>
        ),
        title: "Confirming Transaction",
        description: "Waiting for blockchain confirmation...",
        color: "text-blue-600",
      };
    }

    if (status === "pending" || data.isDeploying) {
      return {
        icon: (
          <div className="w-6 h-6 animate-spin text-blue-500">
            <Loader2 />
          </div>
        ),
        title: "Deploying Coin",
        description: "Please confirm the transaction in your wallet",
        color: "text-blue-600",
      };
    }

    return {
      icon: (
        <div className="w-6 h-6 animate-spin text-blue-500">
          <Loader2 />
        </div>
      ),
      title: "Preparing Deployment",
      description: "Setting up your coin for deployment...",
      color: "text-blue-600",
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deploy Your Coin</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your coin is being deployed to the Zora protocol on Base
        </p>
        {backingInfo && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              Backing Currency:
            </span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={
                      backingInfo.creatorBacked ? "default" : "secondary"
                    }
                    className="text-xs cursor-help"
                  >
                    {backingInfo.label}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  {backingInfo.creatorBacked
                    ? "Uses your Creator Coin for markets. Aligns rewards and reduces slippage risk."
                    : "Uses ZORA for markets. Connect or set up a Creator Coin to prefer creator-backed markets."}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center space-y-6 py-8">
          {/* Status Icon */}
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
            {statusInfo.icon}
          </div>

          {/* Status Text */}
          <div className="text-center space-y-2">
            <h3 className={`text-lg font-semibold ${statusInfo.color}`}>
              {statusInfo.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {statusInfo.description}
            </p>
          </div>

          {/* Transaction Hash */}
          {txHash && (
            <div className="text-center space-y-2">
              <p className="text-xs text-muted-foreground">Transaction Hash:</p>
              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </code>
            </div>
          )}

          {/* Progress Steps */}
          <div className="w-full max-w-md space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${data.metadataUri ? "bg-green-500" : "bg-muted"
                  }`}
              />
              <span className="text-sm">Metadata uploaded to IPFS</span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${status === "pending" || isConfirming || isSuccess
                  ? "bg-green-500"
                  : "bg-muted"
                  }`}
              />
              <span className="text-sm">Transaction submitted</span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${isSuccess ? "bg-green-500" : "bg-muted"
                  }`}
              />
              <span className="text-sm">Coin deployed on blockchain</span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${data.deployedCoin ? "bg-green-500" : "bg-muted"
                  }`}
              />
              <span className="text-sm">Ready for trading</span>
            </div>
          </div>

          {/* Additional Info */}
          {data.deployedCoin && (
            <div className="text-center space-y-2 pt-4 border-t w-full max-w-md">
              <p className="text-sm text-muted-foreground">
                Your coin &quot;{data.coinName}&quot; (${data.coinSymbol}) is
                now live!
              </p>
              <p className="text-xs text-muted-foreground">
                Share it with your community and start earning from trading
                activity.
              </p>
              <div className="pt-3">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
                  onClick={async () => {
                    const text = `I just launched ${data.coinName} ($${data.coinSymbol}) on @saywaht`;
                    const link = data.deployedCoin?.address
                      ? `https://zora.co/coin/base:${data.deployedCoin.address}`
                      : `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.netlify.app"}/trade`;
                    hapticSelection();
                    hapticImpact("light");
                    try {
                      const composer = (sdk.actions as any).composeCast;
                      if (typeof composer === "function") {
                        const result = await composer({
                          text: `${text} 🎬🪙`,
                          embeds: [link],
                        });
                        if (result?.cast?.hash) {
                          await (sdk.actions as any).viewCast({
                            hash: result.cast.hash,
                          });
                        }
                      } else {
                        await sdk.actions.openUrl(
                          `https://warpcast.com/~/compose?text=${encodeURIComponent(
                            `${text} 🎬🪙`
                          )}&embeds[]=${encodeURIComponent(link)}`
                        );
                      }
                      hapticNotify("success");
                    } catch { }
                  }}
                >
                  <span className="text-sm">🚀</span>
                  Share on Farcaster
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <a
                  href="/templates"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm"
                >
                  🎨 Create Another
                </a>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm"
                >
                  Browse Gallery
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
