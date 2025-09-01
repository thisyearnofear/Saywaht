"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RainbowKitProvider,
  connectorsForWallets,
  getDefaultWallets,
} from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
  rainbowWallet,
  trustWallet,
} from "@rainbow-me/rainbowkit/wallets";
import "@rainbow-me/rainbowkit/styles.css";

// WalletConnect project ID - get from https://cloud.walletconnect.com/
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  "b19c9a5e8c4d8b2e7f8c7b5a3d2e1f9a";

// Module-level singletons to avoid double initialization during HMR or multi-mount
let wagmiConfigSingleton: ReturnType<typeof createConfig> | null = null;
let queryClientSingleton: QueryClient | null = null;

function getWagmiConfig() {
  if (wagmiConfigSingleton) return wagmiConfigSingleton;

  // Configure wallet connectors with mobile wallet support (create once)
  const { wallets } = getDefaultWallets();

  const connectors = connectorsForWallets(
    [
      ...wallets,
      {
        groupName: "Popular",
        wallets: [metaMaskWallet, coinbaseWallet, walletConnectWallet],
      },
      {
        groupName: "Mobile",
        wallets: [trustWallet, rainbowWallet],
      },
    ],
    {
      appName: "saywaht - Video Creator Coins",
      projectId,
    }
  );

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
}

function getQueryClient() {
  if (queryClientSingleton) return queryClientSingleton;
  queryClientSingleton = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 2,
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
          modalSize="compact"
          showRecentTransactions={true}
          coolMode
          initialChain={base}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
