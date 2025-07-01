# OpenCut (SayWhat) Project

## Overview
A decentralized video commentary platform that enables users to create memetic content and mint it as tradeable Zora coins. Features FilCDN integration for low-latency content delivery and real-time video editing capabilities.

## Commands
- Build: `bun run build` (all), `bun run build --filter=web` (single app)
- Lint: `bun run lint`, `bun run format` (uses Biome)
- Dev: `bun run dev` (all), `cd apps/web && bun run dev` (single app)
- Type check: `bun run check-types`
- Database: `cd packages/db && bun run db:studio`, `cd apps/web && bun run db:push:local`

## Architecture
- **Turborepo monorepo** with apps/ and packages/
- **Frontend**: `apps/web` - Next.js app with video editor and Zora integration
- **Auth**: `packages/auth` - Better Auth with Google OAuth
- **Database**: `packages/db` - Drizzle ORM with PostgreSQL
- **Storage**: FilCDN integration for decentralized content delivery
- **Blockchain**: Zora Protocol for coin minting and trading

## Key Integrations

### 🚀 **FilCDN (Hackathon Feature)**
- **PDP Storage**: Creates Filecoin Proof of Data Possession deals
- **CDN Delivery**: Low-latency content retrieval via FilCDN
- **Implementation**: `apps/web/src/lib/filcdn.ts` + Synapse SDK
- **Upload Component**: `apps/web/src/components/editor/file-upload.tsx`
- **URL Format**: `https://{wallet}.calibration.filcdn.io/{cid}`

### 🪙 **Zora Protocol Integration** 
- **Real API**: Uses `@zoralabs/coins-sdk` for live coin data
- **Discovery Feed**: Shows actual coins with market data
- **Minting**: Complete WAGMI-based coin creation workflow
- **Implementation**: `apps/web/src/lib/zora.ts` + mint pages

### 🎬 **Video Editor**
- **Timeline**: Multi-track editing with drag & drop
- **Media Panel**: Supports both local files and FilCDN uploads
- **Export**: Canvas-based video rendering (supports FilCDN URLs)
- **AI Voice**: ElevenLabs integration for commentary generation

## Environment Variables

### Required for Production
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Authentication
BETTER_AUTH_SECRET=your-secret-key
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://yourdomain.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### Required for FilCDN (Hackathon)
```bash
# Filecoin Calibration Testnet
NEXT_PUBLIC_FILECOIN_PRIVATE_KEY=your-private-key
NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS=0xYourWalletAddress
```

### Optional Enhancements
```bash
# AI Voice Generation
ELEVENLABS_API_KEY=your-elevenlabs-key

# Zora API (recommended to avoid rate limits)
NEXT_PUBLIC_ZORA_API_KEY=your-zora-api-key
```

## FilCDN Setup (Hackathon Demo)

### 1. Wallet Setup
1. Configure Metamask for [Filecoin Calibration testnet](https://docs.filecoin.io/networks/calibration/details)
2. Get tFIL from [Calibration Faucet](https://faucet.calibration.fildev.network/)
3. Get USDFC tokens for storage payments

### 2. Initial Payment Setup
1. Visit [FilCDN Demo App](https://fs-upload-dapp.netlify.app)
2. Connect wallet and complete payment setup
3. Approve spending allowances for storage deals
4. Note your wallet address for environment variables

### 3. Test Integration
```bash
cd apps/web
bun run dev

# 1. Go to /editor
# 2. Click "FilCDN" tab in media panel  
# 3. Upload video/audio files
# 4. Files appear instantly via CDN
# 5. Create timeline compositions
# 6. Mint as Zora coins at /mint
```

## Code Style & Standards
- **Package Manager**: Bun
- **Formatter**: Biome (tab indentation, double quotes)
- **Import Organization**: Auto-organize enabled
- **TypeScript**: Strict mode throughout
- **UI**: React + Tailwind CSS + Radix UI
- **State**: Zustand with persistence
- **Security**: Rate limiting, input validation, environment checks

## Production Deployment
- All secrets externalized via environment variables
- Docker Compose ready with health checks
- Secure API endpoints with rate limiting  
- Cross-origin support for FilCDN content
- Error boundaries and graceful fallbacks

## Demo Workflow
1. **Upload** → FilCDN creates PDP deal with CDN enabled
2. **Edit** → Low-latency content loading in video timeline
3. **Mint** → Create tradeable Zora coin with FilCDN metadata
4. **Discover** → Browse real coins with market data via Zora API
