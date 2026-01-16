"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { metaMask } from "wagmi/connectors";
import { walletConnect } from "@wagmi/connectors";
import { handleError } from "@/lib/error-handler";

// ENHANCEMENT: Graceful fallback for WalletConnect project ID
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "6e6bc41fa987ef4e0969f95976de621a";

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  console.warn('NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set, using fallback. Mobile wallet connections may be limited.');
}

// Module-level singletons to avoid double initialization during HMR or multi-mount
let wagmiConfigSingleton: ReturnType<typeof createConfig> | null = null;
let queryClientSingleton: QueryClient | null = null;

function getWagmiConfig() {
  if (wagmiConfigSingleton) return wagmiConfigSingleton;

  try {
    // RADICAL SIMPLIFICATION: Use only essential wagmi connectors
    // This completely eliminates the RainbowKit + @base-org/account dependency chain
    const connectors = [
      metaMask({ 
        dappMetadata: {
          name: "saywaht - Video Creator Coins",
        },
      }),
      walletConnect({
        projectId,
        metadata: {
          name: "saywaht - Video Creator Coins",
          description: "Video Creator Coins Platform",
          url: "https://saywaht.netlify.app",
          icons: ["https://saywaht.netlify.app/logo.png"],
        },
      }),
    ];

    wagmiConfigSingleton = createConfig({
      connectors,
      chains: [base, baseSepolia],
      transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
      },
      ssr: true,
    });

    return wagmiConfigSingleton;
  } catch (error) {
    // ENHANCEMENT: Handle wallet configuration errors gracefully
    handleError(error, 'Wallet configuration');
    throw error;
  }
}

function getQueryClient() {
  if (queryClientSingleton) return queryClientSingleton;
  
  // ENHANCEMENT: Better error handling and retry logic for queries
  queryClientSingleton = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors
          if (error instanceof Error && error.message.includes('4')) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 1,
      },
    },
  });
  return queryClientSingleton;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const config = getWagmiConfig();
  const queryClient = getQueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
