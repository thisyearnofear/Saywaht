<img src="apps/web/public/logo.png" align="left" width="130" height="130">

<div align="right">

# SayWhat (prev AppCut)

### A free, open-source video editor for web, desktop, and mobile.

</div>

## Why?

- **Privacy**: Your videos stay on your device
- **Free features**: Every basic feature of CapCut is paywalled now
- **Simple**: People want editors that are easy to use - CapCut proved that

## Features

### **🎬 Video Creation**

- **Timeline-based editing** - Professional video editing in your browser
- **Multi-track support** - Layer videos, audio, and effects
- **Real-time preview** - See changes instantly
- **IPFS storage** - Decentralized, permanent content storage via Grove

### **🪙 Creator Economy**

- **Video creator coins** - Each video becomes a tradeable coin using Zora Protocol
- **Creator-supporter trading** - Fans can invest in creators through coin trading
- **Automated rewards** - Creators earn from trading fees (50% of all trades)
- **Uniswap V4 integration** - Seamless liquidity and price discovery

### **🔐 Decentralized & Private**

- **Wallet-based authentication** - No accounts, just connect your Web3 wallet
- **No watermarks or subscriptions** - Completely free and open source
- **Mobile-first design** - Optimized for mobile without traditional navigation
- Analytics provided by [Databuddy](https://www.databuddy.cc?utm_source=saywhat), 100% Anonymized & Non-invasive.

## Project Structure

- `apps/web/` – Main Next.js web application
- `src/components/` – UI and editor components
- `src/hooks/` – Custom React hooks
- `src/lib/` – Utility and API logic
- `src/stores/` – State management (Zustand, etc.)
- `src/types/` – TypeScript types

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS
- **Icons**: React Icons (Lucide variants)
- **State Management**: Zustand
- **Web3**: Wagmi, Viem, WalletConnect
- **Storage**: IPFS via Grove, Upstash Redis
- **Blockchain**: Base (Ethereum L2), Zora Protocol
- **Package Manager**: Bun (recommended)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your system:

- [Bun](https://bun.sh/docs/installation) (recommended) or [Node.js](https://nodejs.org/en/)
- A Web3 wallet (MetaMask, WalletConnect, etc.) for authentication

### Setup

1.  **Clone the repository**

    ```bash
    git clone <repo-url>
    cd SayWhat
    ```

2.  **Install dependencies**

    ```bash
    bun install
    ```

3.  **Environment Setup (Optional)**

    For full functionality, create `apps/web/.env.local`:

    ```bash
    # Core Features (Required for FilCDN + Trading)
    NEXT_PUBLIC_FILECOIN_PRIVATE_KEY=your-filecoin-private-key
    NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS=0xYourWalletAddress
    NEXT_PUBLIC_ZORA_API_KEY=your-zora-api-key

    # Optional Features
    ELEVENLABS_API_KEY=your-elevenlabs-key
    UPSTASH_REDIS_REST_URL=your-redis-url
    UPSTASH_REDIS_REST_TOKEN=your-redis-token
    ```

4.  **Start the development server**

    ```bash
    bun run dev
    ```

5.  **Connect your wallet & start creating**
    - Open [http://localhost:3000](http://localhost:3000)
    - Connect your Web3 wallet (MetaMask, WalletConnect, etc.)
    - Start creating and trading video coins immediately!

6.  **Explore the platform**
    - **Landing** (`/`) - Wallet connection and coin discovery
    - **Editor** (`/editor`) - Professional video editing with FilCDN
    - **Trading** (`/trade`) - Creator coin marketplace

The application will be available at [http://localhost:3000](http://localhost:3000).

## Development Status

### Recent Improvements ✅

- **TypeScript Strict Mode**: Full compliance with TypeScript strict mode for better type safety
- **Icon Library Migration**: Migrated from lucide-react to react-icons for better compatibility
- **Build Optimization**: Resolved all TypeScript compilation errors for production builds
- **Component Type Safety**: Enhanced type definitions across all React components
- **Production Ready**: Successfully building and deploying without errors

### Current Features

- ✅ **Video Editor**: Timeline-based editing with multi-track support
- ✅ **Web3 Integration**: Wallet connection and authentication
- ✅ **IPFS Storage**: Decentralized file storage via Grove
- ✅ **Creator Coins**: Video tokenization using Zora Protocol
- ✅ **Mobile Support**: Responsive design optimized for mobile devices
- ✅ **TypeScript**: Full type safety with strict mode enabled

## 🌐 Three-Phase App Architecture

SayWhat follows a **mobile-first, three-phase design**:

### **Phase 1: Landing & Discovery** (`/`)

- **Wallet connection** - Instant access with any Web3 wallet (MetaMask, WalletConnect)
- **Coin discovery** - Browse and trade existing creator coins
- **Mobile-first design** - Optimized for mobile without traditional navigation

### **Phase 2: Video Creation** (`/editor`)

- **Professional editing** - Timeline-based video editor
- **IPFS storage** - Decentralized content storage via Grove
- **Project sharing** - Share projects via IPFS links

### **Phase 3: Trading & Discovery** (`/trade`)

- **Creator coin trading** - Buy/sell video creator coins
- **Mobile-first interface** - TikTok-style vertical feed
- **Real-time markets** - Uniswap V4 integration for liquidity
- **Creator economy** - Supporters invest in creators, creators earn from trading

## Troubleshooting

### Common Issues

**TypeScript Errors**

- Ensure you're using TypeScript strict mode
- All components should have proper type definitions
- Use `react-icons/lu` for Lucide icons instead of `lucide-react`

**Build Failures**

- Run `bun run build` to check for TypeScript errors
- Ensure all dependencies are properly installed with `bun install`
- Check that environment variables are properly configured

**Web3 Connection Issues**

- Ensure you have a Web3 wallet installed (MetaMask, etc.)
- Check that you're on a supported network (Base)
- Verify wallet connection in browser developer tools

**IPFS Upload Issues**

- Verify `NEXT_PUBLIC_FILECOIN_PRIVATE_KEY` is set in `.env.local`
- Check Grove API status and rate limits
- Ensure file sizes are within acceptable limits

### Getting Help

- Check the [Issues](https://github.com/your-repo/issues) page for known problems
- Review the [Docs](docs/) folder for detailed documentation
- Join our community discussions for support

## License

[MIT LICENSE](LICENSE)
