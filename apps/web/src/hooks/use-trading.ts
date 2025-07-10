import { useState } from '@/lib/hooks-provider';
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { tradeCoin } from "@zoralabs/coins-sdk";
import { parseEther } from "viem";
import { toast } from "sonner";

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
      toast.error("Please connect your wallet");
      return;
    }

    setState({ isLoading: true, error: null, txHash: null });

    try {
      const tradeParameters = {
        sell: { type: "eth" as const },
        buy: { 
          type: "erc20" as const, 
          address: coinAddress as `0x${string}`
        },
        amountIn: parseEther(ethAmount),
        slippage: 0.05, // 5% slippage tolerance
        sender: address,
      };

      toast.loading("Executing buy transaction...");

      const receipt = await tradeCoin({
        tradeParameters,
        walletClient,
        account: walletClient.account!,
        publicClient,
      });

      setState({ 
        isLoading: false, 
        error: null, 
        txHash: receipt.transactionHash 
      });

      toast.success("Coin purchased successfully!");
      return receipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to buy coin";
      setState({ isLoading: false, error: errorMessage, txHash: null });
      toast.error(errorMessage);
      throw error;
    }
  };

  const sellCoin = async (coinAddress: string, tokenAmount: string) => {
    if (!address || !walletClient || !publicClient) {
      toast.error("Please connect your wallet");
      return;
    }

    setState({ isLoading: true, error: null, txHash: null });

    try {
      const tradeParameters = {
        sell: { 
          type: "erc20" as const, 
          address: coinAddress as `0x${string}`
        },
        buy: { type: "eth" as const },
        amountIn: parseEther(tokenAmount), // Adjust for token decimals if needed
        slippage: 0.15, // 15% slippage tolerance for selling
        sender: address,
      };

      toast.loading("Executing sell transaction...");

      const receipt = await tradeCoin({
        tradeParameters,
        walletClient,
        account: walletClient.account!,
        publicClient,
      });

      setState({ 
        isLoading: false, 
        error: null, 
        txHash: receipt.transactionHash 
      });

      toast.success("Coin sold successfully!");
      return receipt;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to sell coin";
      setState({ isLoading: false, error: errorMessage, txHash: null });
      toast.error(errorMessage);
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