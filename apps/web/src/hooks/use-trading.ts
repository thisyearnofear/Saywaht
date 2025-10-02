import { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { tradeCoin } from "@zoralabs/coins-sdk";
import { parseEther } from "viem";
import { toast } from "sonner";
import { handleError, withRetry, zoraCircuitBreaker } from "@/lib/error-handler";
import { trackBugFix } from "@/lib/monitoring";
import { recordCustomMetric } from "@/lib/performance-monitor";

export interface TradingState {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
}

export function useTrading() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  
  const [state, setState] = useState<TradingState>({
    isLoading: false,
    error: null,
    txHash: null,
  });

  const buyCoin = async (coinAddress: string, ethAmount: string) => {
    if (!address || !walletClient || !publicClient) {
      const error = new Error("Please connect your wallet");
      handleError(error, 'Trading - wallet connection');
      return;
    }

    setState({ isLoading: true, error: null, txHash: null });

    try {
      // PERFORMANT: Use circuit breaker for external trading service
      const tradingStartTime = performance.now();
      const receipt = await zoraCircuitBreaker.execute(async () => {
        const tradeParameters = {
          sell: { type: "eth" as const },
          buy: { 
            type: "erc20" as const, 
            address: coinAddress as `0x${string}`
          },
          amountIn: parseEther(ethAmount),
          slippage: 0.03, // ENHANCEMENT: Reduced from 5% to 3% for better user experience
          sender: address,
        };

        toast.loading("Executing buy transaction...");

        // ENHANCEMENT: Retry with exponential backoff for network issues
        return withRetry(async () => {
          return tradeCoin({
            tradeParameters,
            walletClient: walletClient as any,
            account: walletClient.account! as any,
            publicClient: publicClient as any,
          });
        }, 2, 3000);
      });

      setState({ 
        isLoading: false, 
        error: null, 
        txHash: receipt.transactionHash 
      });

      // PERFORMANT: Track trading performance
      const tradingDuration = performance.now() - tradingStartTime;
      recordCustomMetric('trading-buy-duration', tradingDuration, 'ms', {
        coinAddress,
        ethAmount,
        success: true
      });

      // ENHANCEMENT: Track successful trading fix
      trackBugFix('trading', true, 'Buy transaction successful', {
        coinAddress,
        ethAmount,
        txHash: receipt.transactionHash,
        duration: tradingDuration
      });

      toast.success("Coin purchased successfully!");
      return receipt;
    } catch (error) {
      const analysis = handleError(error, 'Trading - buy coin');
      setState({ isLoading: false, error: analysis.message, txHash: null });
      throw error;
    }
  };

  const sellCoin = async (coinAddress: string, tokenAmount: string) => {
    if (!address || !walletClient || !publicClient) {
      const error = new Error("Please connect your wallet");
      handleError(error, 'Trading - wallet connection');
      return;
    }

    setState({ isLoading: true, error: null, txHash: null });

    try {
      // PERFORMANT: Use circuit breaker for external trading service
      const tradingStartTime = performance.now();
      const receipt = await zoraCircuitBreaker.execute(async () => {
        const tradeParameters = {
          sell: { 
            type: "erc20" as const, 
            address: coinAddress as `0x${string}`
          },
          buy: { type: "eth" as const },
          amountIn: parseEther(tokenAmount), // Adjust for token decimals if needed
          slippage: 0.05, // ENHANCEMENT: Reduced from 15% to 5% - was causing unexpected losses
          sender: address,
        };

        toast.loading("Executing sell transaction...");

        // ENHANCEMENT: Retry with exponential backoff for network issues
        return withRetry(async () => {
          return tradeCoin({
            tradeParameters,
            walletClient: walletClient as any,
            account: walletClient.account! as any,
            publicClient: publicClient as any,
          });
        }, 2, 3000);
      });

      setState({ 
        isLoading: false, 
        error: null, 
        txHash: receipt.transactionHash 
      });

      // PERFORMANT: Track trading performance
      const tradingDuration = performance.now() - tradingStartTime;
      recordCustomMetric('trading-sell-duration', tradingDuration, 'ms', {
        coinAddress,
        tokenAmount,
        success: true
      });

      // ENHANCEMENT: Track successful trading fix
      trackBugFix('trading', true, 'Sell transaction successful', {
        coinAddress,
        tokenAmount,
        txHash: receipt.transactionHash,
        duration: tradingDuration
      });

      toast.success("Coin sold successfully!");
      return receipt;
    } catch (error) {
      const analysis = handleError(error, 'Trading - sell coin');
      setState({ isLoading: false, error: analysis.message, txHash: null });
      throw error;
    }
  };

  const reset = () => {
    setState({ isLoading: false, error: null, txHash: null });
  };

  return {
    ...state,
    buyCoin,
    sellCoin,
    reset,
    isConnected: !!address,
  };
}