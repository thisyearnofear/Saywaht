"use client";

import "@rainbow-me/rainbowkit/styles.css";

import { WagmiProvider, http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, connectorsForWallets, lightTheme } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
  trustWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { handleError } from "@/lib/error-handler";

// ENHANCEMENT: Graceful fallback for WalletConnect project ID
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "6e6bc41fa987ef4e0969f95976de621a";

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  console.warn(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID not set, using fallback. Mobile wallet connections may be limited."
  );
}

// Module-level singletons to avoid double initialization during HMR or multi-mount
let wagmiConfigSingleton: ReturnType<typeof createConfig> | null = null;
let queryClientSingleton: QueryClient | null = null;

function getWagmiConfig() {
  if (wagmiConfigSingleton) return wagmiConfigSingleton;

  try {
    // ENHANCEMENT: Explicit wallet configuration for better mobile support
    // This ensures MetaMask and other mobile wallets are properly listed
    const connectors = connectorsForWallets(
      [
        {
          groupName: "Popular",
          wallets: [
            metaMaskWallet,
            coinbaseWallet,
            walletConnectWallet,
          ],
        },
        {
          groupName: "Mobile Wallets",
          wallets: [
            trustWallet,
            rainbowWallet,
          ],
        },
        {
          groupName: "Other",
          wallets: [injectedWallet],
        },
      ],
      {
        appName: "saywaht - Video Creator Coins",
        projectId,
      }
    );

    wagmiConfigSingleton = createConfig({
      chains: [base, baseSepolia],
      transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
      },
      connectors,
      // ENHANCEMENT: Disable SSR to prevent hydration mismatches with wallet state
      // This is important for mobile wallets that inject providers asynchronously
      ssr: false,
    });

    return wagmiConfigSingleton;
  } catch (error) {
    // ENHANCEMENT: Handle wallet configuration errors gracefully
    handleError(error, "Wallet configuration");
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
          if (error instanceof Error && error.message.includes("4")) {
            return false;
          }
          return failureCount < 3;
        },
        retryDelay: (attemptIndex) =>
          Math.min(1000 * 2 ** attemptIndex, 30000),
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
        <RainbowKitProvider 
          theme={lightTheme({
            accentColor: '#3b82f6',
            accentColorForeground: '#ffffff',
            borderRadius: 'medium',
          })}
          appInfo={{
            appName: "saywaht - Video Creator Coins",
            learnMoreUrl: "https://saywaht.netlify.app",
          }}
          modalSize="compact"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
