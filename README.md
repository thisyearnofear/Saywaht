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
    Install the project dependencies using `bun` (recommended) or `npm`.

    ```bash
    # With bun
    bun install

    # Or with npm
    npm install
    ```

3.  **Start the development server**

    ```bash
    # With bun
    bun run dev

    # Or with npm
    npm run dev
    ```

4.  **Connect your wallet**
    - Open [http://localhost:3000](http://localhost:3000)
    - Click "Connect Wallet" to authenticate with your Web3 wallet
    - Start creating and editing videos immediately!

5.  **Explore the three-phase app**
    - **Landing** (`/`) - Wallet authentication and onboarding
    - **Editor** (`/editor`) - Professional video editing and creation
    - **Trading** (`/trade`) - Creator coin trading and discovery

The application will be available at [http://localhost:3000](http://localhost:3000).

## 🌐 Three-Phase App Architecture

SayWhat follows a **mobile-first, three-phase design**:

### **Phase 1: Landing & Authentication** (`/`)

- **Wallet connection** - Instant access with any Web3 wallet
- **Creator onboarding** - Simple introduction to the platform
- **No traditional navigation** - Mobile-optimized, gesture-based design

### **Phase 2: Video Creation** (`/editor`)

- **Professional editing** - Timeline-based video editor
- **IPFS storage** - Decentralized content storage via Grove
- **Project sharing** - Share projects via IPFS links

### **Phase 3: Trading & Discovery** (`/trade`)

- **Creator coin trading** - Buy/sell video creator coins
- **Mobile-first interface** - TikTok-style vertical feed
- **Real-time markets** - Uniswap V4 integration for liquidity
- **Creator economy** - Supporters invest in creators, creators earn from trading

## License

[MIT LICENSE](LICENSE)
