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

- **Wallet-based authentication** - No accounts, just connect your Web3 wallet
- **Timeline-based editing** - Professional video editing in your browser
- **Multi-track support** - Layer videos, audio, and effects
- **Real-time preview** - See changes instantly
- **Decentralized storage** - IPFS integration for permanent, censorship-resistant storage
- **No watermarks or subscriptions** - Completely free and open source
- **Blockchain integration** - Mint your creations as NFTs on Zora Protocol
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

The application will be available at [http://localhost:3000](http://localhost:3000).

## 🌐 Decentralized Architecture

SayWhat is built with a **fully decentralized approach**:

### **🔐 Authentication**

- **Wallet-based auth** - No accounts, passwords, or personal data collection
- **Instant access** - Connect any Web3 wallet (MetaMask, WalletConnect, etc.)
- **Privacy-first** - Your identity is your wallet address

### **💾 Storage**

- **IPFS integration** - Content stored on the decentralized web
- **Local-first** - Projects cached locally for instant access
- **Censorship-resistant** - No central servers to shut down

### **⛓️ Blockchain Integration**

- **Zora Protocol** - Mint your videos as tradeable NFT coins
- **Base Sepolia** - Fast, low-cost transactions
- **Decentralized marketplace** - Trade directly on-chain

## License

[MIT LICENSE](LICENSE)
