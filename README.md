<img src="apps/web/public/logo.png" align="left" width="130" height="130">

<div align="right">

# saywaht (prev AppCut)

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
- **Intelligent export** - Multiple export methods with automatic optimization:
  - **Backend export** - Professional FFmpeg processing for maximum quality
  - **Offline rendering** - Reliable browser-based processing
  - **Auto-selection** - Intelligently chooses the best method for your content

### **⛓️ Decentralized Storage (Filecoin + IPFS)**

- **Dual-layer storage routing** - Automatically selects optimal storage based on file size:
  - **≤8MB**: Grove/IPFS - Fast, free, instant availability
  - **8MB-254MB**: Filecoin (FilCDN) - Permanent, verifiable, cost-effective
- **Filecoin export archival** - Exported video + caption transcript JSON archived via Synapse SDK
- **Content-addressed storage** - Videos identified by unique CID (Content Identifier)
- **Permanent availability** - No server maintenance, no deletion risk
- **Censorship-resistant** - Distributed across global storage network
- **Zora integration** - Exported videos automatically linked to creator coins

### **🪙 Creator Economy**

- **Video creator coins** - Each video becomes a tradeable coin using Zora Protocol
- **Creator-supporter trading** - Fans can invest in creators through coin trading
- **Automated rewards** - Creators earn from trading fees (50% of all trades)
- **Uniswap V4 integration** - Seamless liquidity and price discovery

### **🤖 AI & Privacy**

- **On-device Whisper transcription** - AI captioning runs 100% in browser (no audio sent to servers)
- **Privacy-preserving AI** - Your voice never leaves your device
- **Offline AI processing** - Works without internet after model download
- **Open-source models** - Uses HuggingFace Transformers.js (open weights)

## Filecoin Architecture

```mermaid
flowchart LR
  A["Timeline edit in browser"] --> B["Export pipeline (offline/backend)"]
  A --> C["Whisper transcription in browser"]
  C --> D["Caption entries JSON"]
  B --> E["Exported video blob"]
  E --> F["/api/filecoin/upload"]
  D --> F
  F --> G["Synapse SDK + Filecoin Calibration PDP"]
  G --> H["FilCDN retrieval URLs (video/captions)"]
  H --> I["Manifest JSON upload to FilCDN"]
  I --> J["Retrieval links in metadata"]
```

- Exports larger than 8MB and captioned exports are archived to Filecoin.
- Archive output includes video URL/CID, captions URL/CID, and a retrieval manifest URL/CID.
- `FILECOIN_CALIBRATION_RPC` is used by status checks and Synapse upload initialization.

### **🔐 Decentralized & Private**

- **Wallet-based authentication** - No accounts, just connect your Web3 wallet
- **No watermarks or subscriptions** - Completely free and open source
- **Mobile-first design** - Optimized for mobile without traditional navigation
- **No data collection** - Content stays decentralized, not on our servers

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
- **Storage**: Grove/IPFS + Filecoin (FilCDN via Synapse SDK), Upstash Redis
- **Blockchain**: Base (Ethereum L2), Zora Protocol
- **Video Processing**: FFmpeg (backend), WebCodecs API (frontend)
- **Backend Service**: Node.js + Express for video export processing
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
    cd saywaht
    ```

2.  **Install dependencies**

    ```bash
    bun install
    ```

3.  **Database Setup (Recommended for Auth)**

    Create a Neon PostgreSQL database:

    a. Sign up at [Neon](https://neon.tech) and create a new project
    b. **Skip Neon Auth** - saywaht has its own auth system
    c. Copy your connection string
    d. Configure environment variables:

    ```bash
    # packages/db/.env.local
    DATABASE_URL=postgresql://user:password@host.neon.tech/neondb?sslmode=require

    # apps/web/.env.local  
    DATABASE_URL=postgresql://user:password@host.neon.tech/neondb?sslmode=require
    ```

    e. Push the database schema:

    ```bash
    cd apps/web
    npx drizzle-kit push
    ```

4.  **Environment Setup (Optional)**

    For full functionality, create `apps/web/.env.local`:

    ```bash
    # Database (Required for auth features)
    DATABASE_URL=your-postgresql-connection-string

    # Wallet Connection (Required for mobile wallet support)
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id

    # Core Features (Required for FilCDN + Trading)
    FILECOIN_PRIVATE_KEY=your-filecoin-private-key
    FILECOIN_WALLET_ADDRESS=0xYourWalletAddress
    FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1
    NEXT_PUBLIC_FILECOIN_CALIBRATION_RPC=https://api.calibration.node.glif.io/rpc/v1
    ZORA_API_KEY=your-zora-api-key

    # Storacha (Optional - for permanent caption archival)
    # Get started at: https://storacha.network/
    STORACHA_PRIVATE_KEY=your-storacha-private-key
    STORACHA_DELEGATION=your-delegation-proof

    # Backend Export Service (Optional - enables server-side video processing)
    NEXT_PUBLIC_BACKEND_EXPORT_URL=http://157.180.36.156:3001

    # Optional Features
    ELEVENLABS_API_KEY=your-elevenlabs-key
    UPSTASH_REDIS_REST_URL=your-redis-url
    UPSTASH_REDIS_REST_TOKEN=your-redis-token

    # Analytics (Optional)
    # DataBuddy - 100% Anonymized & Non-invasive analytics
    # Get your client ID from: https://www.databuddy.cc
    NEXT_PUBLIC_DATABUDDY_CLIENT_ID=your-databuddy-client-id
    ```

    **Note:** To enable mobile wallet connections (MetaMask Mobile, Trust Wallet, etc.), get a free WalletConnect Project ID from [https://cloud.walletconnect.com/](https://cloud.walletconnect.com/) and add it to your `.env.local` file. Without this, only browser extension wallets will be available.

5.  **Start the development server**

    ```bash
    bun run dev
    ```

6.  **Connect your wallet & start creating**
    - Open [http://localhost:3000](http://localhost:3000)
    - Connect your Web3 wallet (MetaMask, WalletConnect, etc.)
    - Start creating and trading video coins immediately!

7.  **Explore the platform**
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
- ✅ **Filecoin Archive**: Exported videos + caption transcripts archived to FilCDN
- ✅ **AI Transcription**: On-device Whisper.js caption generation
- ✅ **Storacha (Optional Add-on)**: Can be added as secondary archival layer for transcripts
- ✅ **Creator Coins**: Video tokenization using Zora Protocol
- ✅ **Multi-tier Storage**: Automatic routing between Grove/Filecoin
- ✅ **Mobile Support**: Responsive design optimized for mobile devices
- ✅ **TypeScript**: Full type safety with strict mode enabled

## 🌐 Three-Phase App Architecture

saywaht follows a **mobile-first, three-phase design**:

### **Phase 1: Landing & Discovery** (`/`)

- **Wallet connection** - Instant access with any Web3 wallet (MetaMask, WalletConnect)
- **Coin discovery** - Browse and trade existing creator coins
- **Mobile-first design** - Optimized for mobile without traditional navigation

### **Phase 2: Video Creation** (`/editor`)

- **Professional editing** - Timeline-based video editor
- **Decentralized storage** - Grove/IPFS + Filecoin archival for large exports
- **Project sharing** - Share projects via IPFS links

### **Phase 3: Trading & Discovery** (`/trade`)

- **Creator coin trading** - Buy/sell video creator coins
- **Mobile-first interface** - TikTok-style vertical feed
- **Real-time markets** - Uniswap V4 integration for liquidity
- **Creator economy** - Supporters invest in creators, creators earn from trading

## 🏗️ Decentralized Storage Architecture

Saywaht uses a **multi-tier decentralized storage system** optimized for creator content:

### Storage Routing Logic

```
Video Export (Any Size)
    ↓
Size Check
    ↓
┌─────────────────┬──────────────────┐
│    ≤ 8MB        │    > 8MB         │
│  (Small files)  │  (Large files)   │
└────────┬────────┴────────┬─────────┘
         ↓                 ↓
    Grove/IPFS       Filecoin
    • Fast           • Permanent
    • Free           • Up to 254MB
    • Instant        • Verifiable
```

### Storage Providers

| Provider | Max Size | Cost | Use Case | Speed |
|----------|----------|------|----------|-------|
| **Grove** | 8 MB | Free | Short videos, thumbnails, metadata | ⚡ Instant |
| **Filecoin (FilCDN)** | 254 MB | Allowance-based | Long-form content, high-quality exports | 🕐 1-2 min |
| **Storacha (optional)** | Varies by account | Free tier | Secondary archive for captions/metadata | ⚡ Fast |

### Filecoin Integration

Large videos (>8MB) are stored on **Filecoin Calibration Testnet** via FilCDN:

1. Video exported from editor
2. Uploaded to `/api/filecoin/upload`
3. Synapse SDK stores on Filecoin
4. Content accessible via: `https://{wallet}.calibration.filcdn.io/{cid}`
5. Video + captions + manifest URLs linked in Zora coin metadata

**Key Features:**
- Verifiable storage proofs
- Permanent retention (no expiry)
- Content-addressed (deduplication)
- Direct wallet ownership

### AI Caption Pipeline

On-device AI with permanent storage:

```
User Audio
    ↓
Whisper.js (Browser) → No server upload
    ↓
Transcript Generated
    ↓
Stored with Filecoin archive manifest (FilCDN-first)
    ↓
Optional mirror to Storacha
```

- **100% Private**: Audio never leaves your device
- **Permanent archive path**: Captions are stored with the Filecoin export bundle
- **Open Source**: Uses HuggingFace open-source models

### Architecture Diagram

See [docs/FILECOIN_ARCHITECTURE.md](docs/FILECOIN_ARCHITECTURE.md) for detailed architecture diagrams and data flows.

## Troubleshooting

### Database Issues

**"Cannot find module 'drizzle-orm/pg-core'"**
```bash
cd packages/db
npm install --no-save
```

**"esbuild version mismatch"**
- This is resolved - the packages/db no longer includes explicit esbuild dependencies
- If you still see this, delete `packages/db/node_modules` and run `npm install` in the workspace root

**"DATABASE_URL is not set"**
- Make sure you've created both `packages/db/.env.local` and `apps/web/.env.local`
- Both files need the same `DATABASE_URL` value

**Schema push fails**
```bash
# Make sure you're in the correct directory
cd apps/web
DATABASE_URL="your-connection-string" npx drizzle-kit push
```

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

- Verify `FILECOIN_PRIVATE_KEY` and `FILECOIN_WALLET_ADDRESS` are set in `apps/web/.env.local`
- Verify `FILECOIN_CALIBRATION_RPC` is reachable from your network
- Check Grove API status and rate limits
- Ensure file sizes are within acceptable limits
- For large files (>8MB), ensure Filecoin Calibration testnet is accessible

**Filecoin Storage Issues**

- **"Allowance not sufficient"**: Increase your FilCDN allowance at https://filcdn.com
- **"File exceeds maximum size"**: Filecoin limit is 254MB. Use compression or split videos
- **"Storage provider unavailable"**: Check Calibration testnet status
- **Slow uploads**: Large files take 1-2 minutes for Filecoin storage - this is normal

**AI Transcription Issues**

- **Model download fails**: Whisper models are ~150MB, ensure stable internet for first use
- **Transcription timeout**: Long videos (>5 min) may take time - transcription runs locally
- **Poor accuracy**: Ensure clear audio, minimal background noise
- **Browser crashes**: Very long videos may require more RAM - try shorter clips

### Getting Help

- Check the [Issues](https://github.com/your-repo/issues) page for known problems
- Review the [Docs](docs/) folder for detailed documentation:
  - **[SETUP.md](docs/SETUP.md)** - Complete setup guide, environment variables, and deployment
  - **[ROADMAP.md](docs/ROADMAP.md)** - Feature roadmap, current status, and future plans
  - **[EXPORT.md](docs/EXPORT.md)** - Video export system documentation and troubleshooting
  - **[FILECOIN_ARCHITECTURE.md](docs/FILECOIN_ARCHITECTURE.md)** - Decentralized storage architecture & Filecoin integration
  - **[TESTING.md](docs/TESTING.md)** - Testing checklists and quality assurance
- Join our community discussions for support

## License

[MIT LICENSE](LICENSE)
