# 🚀 Saywaht Setup Guide

## Overview

A decentralized video commentary platform that enables users to create memetic content and deploy it as tradeable Zora coins. Features FilCDN integration for low-latency content delivery and real-time video editing capabilities.

## Commands

- Build: `bun run build` (all), `bun run build --filter=web` (single app)
- Lint: `bun run lint`, `bun run format` (uses Biome)
- Dev: `bun run dev` (all), `cd apps/web && bun run dev` (single app)
- Type check: `bun run check-types`
- Database: `cd packages/db && bun run db:studio`, `cd apps/web && bun run db:push:local`

## Architecture

### **Three-Phase Mobile-First Design**

- **Phase 1**: Landing page (`/`) - Wallet auth and onboarding
- **Phase 2**: Video editor (`/editor`) - Professional editing tools
- **Phase 3**: Trading platform (`/trade`) - Creator coin marketplace

### **Technical Stack**

- **Turborepo monorepo** with apps/ and packages/
- **Frontend**: `apps/web` - Next.js app with three distinct phases
- **Auth**: `packages/auth` - Wallet-based authentication (Wagmi + RainbowKit)
- **Storage**: Grove/IPFS integration for decentralized content storage
- **Trading**: Zora Coins SDK + Uniswap V4 for creator coin trading
- **State Management**: Zustand with localStorage persistence
- **Navigation**: Mobile-first, no headers, gesture-based transitions

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
- **Deployment**: Complete WAGMI-based coin creation workflow
- **Implementation**: `apps/web/src/lib/zora.ts` + mint pages

### 🎬 **Video Editor**

- **Timeline**: Multi-track editing with drag & drop
- **Media Panel**: Supports both local files and FilCDN uploads
- **Export**: Canvas-based video rendering (supports FilCDN URLs)
- **AI Voice**: ElevenLabs integration for commentary generation

## Environment Variables

### Optional for Enhanced Features

```bash
# AI Voice Generation
ELEVENLABS_API_KEY=your-elevenlabs-key

# Blockchain Integration
NEXT_PUBLIC_ZORA_API_KEY=your-zora-api-key
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
# 6. Deploy as Zora coins at /mint
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
2. **Edit** → Low-latency content loading in timeline
3. **Mint** → Create tradeable Zora coin with FilCDN metadata
4. **Discover** → Browse real coins with market data via Zora API

## Mobile Optimization Implementation

### **Phase 1: Landing & Account Management**

#### Responsive Landing Page

```typescript
// apps/web/src/components/landing/hero.tsx
// Implement responsive design with tailwind breakpoints
const Hero = () => {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between">
      {/* Mobile-first content structure */}
      <div className="w-full md:w-1/2 space-y-4 text-center md:text-left">
        <h1 className="text-3xl md:text-5xl font-bold">saywaht: Coin Your Commentary</h1>
        {/* Additional responsive content */}
      </div>
      {/* Mobile-optimized CTA placement */}
    </div>
  );
};
```

#### Streamlined Onboarding

```typescript
// apps/web/src/components/onboarding/wallet-connect.tsx
// Simplified wallet connection flow optimized for mobile
const WalletConnect = () => {
  const { isConnected } = useAccount();

  return (
    <div className="p-4 rounded-lg bg-background/80 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-4">Connect to Create</h2>
      <p className="mb-4 text-muted-foreground">Connect your wallet to start creating and trading commentary coins.</p>

      {!isConnected ? (
        <ConnectButton.Custom>
          {/* Mobile-optimized connect button */}
        </ConnectButton.Custom>
      ) : (
        <Button className="w-full" asChild>
          <Link href="/editor">Start Creating</Link>
        </Button>
      )}
    </div>
  );
};
```

### **Phase 2: Creation & Editing**

#### Mobile-Optimized Editor Layout

```typescript
// apps/web/src/app/editor/page.tsx
// Implement responsive editor layout with conditional rendering
const EditorPage = () => {
  const isMobile = useIsMobile();

  return (
    <div className="h-screen flex flex-col">
      <EditorHeader />

      {isMobile ? (
        // Mobile layout: Vertical stacking of panels
        <div className="flex-1 flex flex-col overflow-hidden">
          <MobilePreviewPanel />
          <MobileTabNavigation />
          <div className="flex-1 overflow-hidden">
            {/* Swipeable tabs for Media, Timeline, Properties */}
            <SwipeableTabs
              tabs={[
                { label: "Media", content: <MediaPanel /> },
                { label: "Timeline", content: <Timeline /> },
                { label: "Properties", content: <PropertiesPanel /> }
              ]}
            />
          </div>
        </div>
      ) : (
        // Desktop layout: Resizable panels
        <ResizablePanelGroup direction="horizontal">
          {/* Existing desktop layout */}
        </ResizablePanelGroup>
      )}
    </div>
  );
};
```

#### Touch-Friendly Timeline Controls

```typescript
// apps/web/src/components/editor/timeline/mobile-timeline.tsx
// Implement touch-friendly timeline controls
const MobileTimeline = () => {
  const { clips, currentTime, duration } = useTimelineStore();
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchControls();

  return (
    <div className="w-full">
      {/* Simplified timeline track view */}
      <div
        className="relative h-20 bg-background/80 rounded-md overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Render clips with touch targets */}
        {clips.map((clip) => (
          <div
            key={clip.id}
            className="absolute h-full rounded-md touch-manipulation"
            style={{
              left: `${(clip.startTime / duration) * 100}%`,
              width: `${((clip.endTime - clip.startTime) / duration) * 100}%`,
              backgroundColor: clip.color || 'rgba(59, 130, 246, 0.5)'
            }}
          />
        ))}

        {/* Touch-friendly playhead */}
        <div
          className="absolute h-full w-1 bg-primary"
          style={{ left: `${(currentTime / duration) * 100}%` }}
        />
      </div>

      {/* Mobile-specific timeline controls */}
      <div className="flex justify-between mt-2">
        <Button size="sm" variant="outline" onClick={() => /* Zoom out */}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
        <Button size="sm" variant="outline" onClick={() => /* Zoom in */}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
```

### **Phase 3: Trading & Monetization**

#### Uniswap V4 Integration

```typescript
// apps/web/src/lib/uniswap.ts
// Implement Uniswap V4 integration for trading
import { createPublicClient, http } from "viem";
import { wagmiConfig } from "@/lib/wagmi";

export const initializeUniswap = () => {
  const publicClient = createPublicClient({
    chain: wagmiConfig.chains[0],
    transport: http(),
  });

  return {
    swapTokens: async (params) => {
      // Implementation for token swapping
    },
    addLiquidity: async (params) => {
      // Implementation for adding liquidity
    },
    getPoolData: async (poolAddress) => {
      // Implementation for fetching pool data
    },
  };
};
```

#### Mobile Trading Interface

```typescript
// apps/web/src/components/trading/mobile-trade-panel.tsx
// Implement mobile-optimized trading interface
const MobileTradePanel = ({ coinAddress }) => {
  const [tradeType, setTradeType] = useState('buy'); // 'buy' or 'sell'
  const [amount, setAmount] = useState('');
  const { data: coinData } = useCoinData(coinAddress);

  return (
    <div className="p-4 rounded-lg bg-background/80 backdrop-blur-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{coinData?.name}</h2>
        <div className="flex space-x-1">
          <Button
            size="sm"
            variant={tradeType === 'buy' ? 'default' : 'outline'}
            onClick={() => setTradeType('buy')}
          >
            Buy
          </Button>
          <Button
            size="sm"
            variant={tradeType === 'sell' ? 'default' : 'outline'}
            onClick={() => setTradeType('sell')}
          >
            Sell
          </Button>
        </div>
      </div>

      {/* Amount input with mobile-friendly numeric keyboard */}
      <div className="mb-4">
        <label className="text-sm text-muted-foreground">Amount</label>
        <input
          type="number"
          inputMode="decimal"
          className="w-full p-2 rounded-md border bg-background"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </div>

      {/* Price impact and execution details */}
      <div className="space-y-2 mb-4 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Price</span>
          <span>{coinData?.price} ETH</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Price Impact</span>
          <span className="text-green-500">~0.05%</span>
        </div>
      </div>

      {/* Execute trade button */}
      <Button className="w-full" size="lg">
        {tradeType === 'buy' ? 'Buy' : 'Sell'} {coinData?.symbol}
      </Button>
    </div>
  );
};
```

## Implementation Timeline

### **Week 1-2: Mobile Optimization**

- Implement responsive layouts for landing page and account management
- Develop mobile-optimized editor interface with vertical panel stacking
- Create touch-friendly controls for timeline and media management
- Implement adaptive UI components that respond to screen size

### **Week 3-4: Trading Integration**

- Integrate Uniswap V4 SDK for trading functionality
- Develop buy/sell interface for commentary coins
- Implement liquidity provision capabilities
- Create mobile-optimized trading experience

### **Week 5-6: Polish & Testing**

- Optimize performance for mobile devices
- Conduct usability testing on various device sizes
- Fix bugs and improve user experience
- Prepare for production deployment

## Troubleshooting

### **Mobile Optimization Issues**

- **Touch events not working**: Check event propagation and touch event handlers
- **Layout breaking on certain devices**: Test with different viewport sizes
- **Performance issues on mobile**: Reduce animations and optimize rendering

### **Trading Integration Issues**

- **Uniswap connection failures**: Verify network configuration and provider setup
- **Transaction errors**: Check wallet connection and gas settings
- **Price impact calculation issues**: Verify pool data fetching and calculation logic

### **FilCDN Issues**

- **"Allowance not sufficient"**: Need more USDFC tokens or increase allowance
- **"Private key required"**: Check `NEXT_PUBLIC_FILECOIN_PRIVATE_KEY` is set
- **Upload timeout**: File might be too large (254MB limit)

### **Build Issues**

- **"Module not found"**: Run `bun install` in root directory
- **Type errors**: Run `bun run check-types` to see specific issues
- **Port conflicts**: Change port in `package.json` or kill existing processes

### **Zora Issues**

- **"No coins found"**: Normal if no coins exist yet, will show fallback
- **Rate limiting**: Add `NEXT_PUBLIC_ZORA_API_KEY` for higher limits
- **Transaction failures**: Check wallet connection and testnet balance

## Health Checks

After implementation, verify:

- [ ] Responsive design works on mobile devices (320px-428px width)
- [ ] Touch controls function properly on mobile devices
- [ ] Trading functionality works with test transactions
- [ ] Performance is acceptable on mid-range mobile devices
- [ ] All three app phases (Landing, Creation, Trading) are functional