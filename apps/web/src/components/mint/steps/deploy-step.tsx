"use client";

import { useEffect, useState } from "@/lib/hooks-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LuLoader as Loader2, LuCheck, LuX } from "react-icons/lu";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSimulateContract,
  usePublicClient,
} from "wagmi";
import { toast } from "sonner";
import {
  createCoinCall,
  DeployCurrency,
  setApiKey,
  validateMetadataURIContent,
  getCoinCreateFromLogs,
} from "@zoralabs/coins-sdk";
import { submitReferral } from "@divvi/referral-sdk";
import { MintWizardData } from "../mint-wizard";
import { base } from "viem/chains";
import type { ValidMetadataURI } from "@zoralabs/coins-sdk";
import { PLATFORM_ADDRESS } from "@/lib/constants";
import { triggerCoinCelebration } from "@/lib/confetti";

// Set Zora API key if available
if (process.env.NEXT_PUBLIC_ZORA_API_KEY) {
  setApiKey(process.env.NEXT_PUBLIC_ZORA_API_KEY);
}

interface DeployStepProps {
  data: MintWizardData;
  updateData: (updates: Partial<MintWizardData>) => void;
}

export function DeployStep({ data, updateData }: DeployStepProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();

  // Prepare contract call parameters
  const [contractCallParams, setContractCallParams] = useState<any>(null);

  // Use simulate contract to prepare the transaction - only when params are ready
  const { data: simulateData } = useSimulateContract(
    contractCallParams || undefined
  );

  // Use write contract with the simulated data
  const { writeContract, data: txHash, status, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

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

        // Validate metadata URI content before proceeding
        console.log("🔍 Validating metadata URI content...");
        try {
          await validateMetadataURIContent(
            data.metadataUri as ValidMetadataURI
          );
          console.log("✅ Metadata validation passed");
        } catch (validationError) {
          console.error("❌ Metadata validation failed:", validationError);
          toast.error(
            "Metadata validation failed. Please try regenerating your metadata."
          );
          updateData({ isDeploying: false });
          return;
        }

        // Create the coin call parameters
        const coinParams = {
          name: data.coinName,
          symbol: data.coinSymbol,
          uri: data.metadataUri as ValidMetadataURI,
          payoutRecipient: address,
          platformReferrer: PLATFORM_ADDRESS, // SayWhat earns 15% of all trading fees!
          chainId: base.id,
          currency: DeployCurrency.ZORA, // Use ZORA as the trading currency
        };

        // Get the contract call parameters
        const callParams = await createCoinCall(coinParams);
        console.log("📋 Contract call prepared:", callParams);

        setContractCallParams(callParams);
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
    contractCallParams,
    // updateData is intentionally excluded to prevent infinite loop
  ]);

  // Auto-deploy when simulation is ready
  useEffect(() => {
    if (!simulateData || data.isDeploying || data.deployedCoin) return;

    const deployNow = async () => {
      updateData({ isDeploying: true });

      try {
        console.log("🚀 Deploying coin to blockchain...");
        await writeContract(simulateData.request);
      } catch (err) {
        console.error("Deploy failed:", err);

        // Handle specific error types
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
    simulateData,
    data.isDeploying,
    data.deployedCoin,
    writeContract,
    updateData,
  ]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isSuccess && txHash && address && publicClient) {
      const handleSuccess = async () => {
        try {
          // Get transaction receipt to extract coin address
          const receipt = await publicClient.getTransactionReceipt({
            hash: txHash,
          });
          const coinDeployment = getCoinCreateFromLogs(receipt);

          console.log("🪙 Coin deployed successfully!");
          console.log("📍 Coin address:", coinDeployment?.coin);

          // Trigger celebration confetti
          triggerCoinCelebration();

          toast.dismiss();
          toast.success("Content coin created successfully! 🎉");
          updateData({
            deployedCoin: {
              name: data.coinName,
              symbol: data.coinSymbol,
              address: coinDeployment?.coin || undefined,
            },
            isDeploying: false,
          });
        } catch (error) {
          console.error("Failed to extract coin address:", error);
          // Still mark as successful even if we can't extract the address
          toast.dismiss();
          toast.success("Content coin created successfully! 🎉");
          updateData({
            deployedCoin: { name: data.coinName, symbol: data.coinSymbol },
            isDeploying: false,
          });
        }
      };

      handleSuccess();

      // Submit Divvi referral tracking (optional, non-blocking)
      const submitDivviTracking = async () => {
        try {
          console.log("📝 Submitting Divvi referral tracking for tx:", txHash);
          const chainId = base.id; // Base mainnet
          await submitReferral({
            txHash,
            chainId,
          });
          console.log("✅ Divvi referral tracking submitted");
        } catch (error) {
          console.error("❌ Failed to submit Divvi referral tracking:", error);
          // Don't show error to user - this is optional tracking
        }
      };

      submitDivviTracking();
    } else if (status === "error") {
      toast.dismiss();

      if (error?.message) {
        if (
          error.message.includes("User denied") ||
          error.message.includes("user rejected")
        ) {
          toast.error("Transaction cancelled by user");
        } else if (error.message.includes("insufficient funds")) {
          toast.error("Insufficient funds to complete transaction");
        } else if (error.message.includes("network")) {
          toast.error(
            "Network error. Please check your connection and try again"
          );
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error("Transaction failed. Please try again");
      }

      updateData({ isDeploying: false });
    }
  }, [
    isSuccess,
    txHash,
    status,
    error,
    data.coinName,
    data.coinSymbol,
    address,
    publicClient,
    // updateData is intentionally excluded to prevent infinite loop
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
                className={`w-2 h-2 rounded-full ${
                  data.metadataUri ? "bg-green-500" : "bg-muted"
                }`}
              />
              <span className="text-sm">Metadata uploaded to IPFS</span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  status === "pending" || isConfirming || isSuccess
                    ? "bg-green-500"
                    : "bg-muted"
                }`}
              />
              <span className="text-sm">Transaction submitted</span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  isSuccess ? "bg-green-500" : "bg-muted"
                }`}
              />
              <span className="text-sm">Coin deployed on blockchain</span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  data.deployedCoin ? "bg-green-500" : "bg-muted"
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
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
