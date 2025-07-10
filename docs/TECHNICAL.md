# 🚀 Technical Implementation Plan

## 🔍 **Overview**

This technical implementation plan focuses on transforming SayWhat into a fully mobile-optimized application with integrated trading functionality, structured around three distinct phases: Landing & Account Management, Creation & Editing, and Trading & Monetization.

### 1. **Clone and Install**

```bash
git clone <your-repo>
cd Saywaht
bun install
```

### 2. **Environment Setup (Optional)**

Create `apps/web/.env.local` for optional features:

```bash
# Optional - Enhanced features
ELEVENLABS_API_KEY=your-elevenlabs-key
NEXT_PUBLIC_ZORA_API_KEY=your-zora-api-key

# Required for Core Functionality
NEXT_PUBLIC_FILECOIN_PRIVATE_KEY=your-filecoin-private-key
NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS=0xYourWalletAddress
NEXT_PUBLIC_ZORA_API_KEY=your-zora-api-key

# Optional - Enhanced features
ELEVENLABS_API_KEY=your-elevenlabs-key
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

### 3. **FilCDN Setup (Required for Hackathon)**

#### 3.1 Wallet Configuration

1. **Install Metamask** and add Filecoin Calibration network:

   ```
   Network Name: Filecoin Calibration
   RPC URL: https://api.calibration.node.glif.io/rpc/v1
   Chain ID: 314159
   Currency: tFIL
   ```

2. **Get Test Tokens**:
   - **tFIL**: https://faucet.calibration.fildev.network/
   - **USDFC**: https://faucet.calibration.fildev.network/ (for storage payments)

#### 3.2 Initial Payment Setup

1. Visit: https://fs-upload-dapp.netlify.app
2. Connect your wallet
3. Go to "Manage Storage" tab
4. Click "Deposit & Increase Allowances"
5. Approve transactions for storage payments
6. Note your wallet address → add to `NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS`
7. Export private key → add to `NEXT_PUBLIC_FILECOIN_PRIVATE_KEY`

### 3. **Start Development**

```bash
# Start the app
bun run dev

# Or start just the web app
cd apps/web
bun run dev
```

Visit: http://localhost:3000

## 🎪 **Demo Workflow**

### **1. Test FilCDN Upload**

1. Go to `/editor`
2. Click "FilCDN" tab in media panel
3. Drag & drop a video file (max 254MB)
4. Watch upload progress and FilCDN URL generation

### **2. Test Video Editor**

1. Add uploaded file to timeline
2. Create a simple composition
3. Test playback (low-latency FilCDN content)

### **3. Test Zora Integration**

1. Connect wallet (same one used for FilCDN)
2. Go to `/mint/project-id`
3. Create coin name and symbol
4. Mint as Zora coin
5. Check discovery feed for real Zora coins

### **4. Full Demo Flow**

```
Upload → FilCDN (PDP deal) → Edit → Timeline → Mint → Zora Coin → Discovery
```

## 🐳 **Production Deployment with Docker**

### 1. **Environment File**

Create `.env` file:

```bash
# Database
POSTGRES_PASSWORD=your-secure-password
DATABASE_URL=postgresql://saywaht:your-secure-password@db:5432/saywaht

# Auth
BETTER_AUTH_SECRET=your-production-secret-256-bit
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://yourdomain.com

# FilCDN
NEXT_PUBLIC_FILECOIN_PRIVATE_KEY=your-filecoin-private-key
NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS=0xYourWalletAddress

# Optional
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
ELEVENLABS_API_KEY=your-elevenlabs-key
NEXT_PUBLIC_ZORA_API_KEY=your-zora-api-key
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
REDIS_TOKEN=your-redis-token
```

### 2. **Deploy**

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f web

# Health check
curl http://localhost:3000/api/health
```

## 📱 **Mobile Optimization Implementation**

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
        <h1 className="text-3xl md:text-5xl font-bold">SayWhat: Coin Your Commentary</h1>
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

// Initialize Uniswap SDK
export const initializeUniswap = () => {
  const publicClient = createPublicClient({
    chain: wagmiConfig.chains[0],
    transport: http(),
  });

  // Initialize Uniswap hooks and contracts
  return {
    // Trading functions
    swapTokens: async (params) => {
      // Implementation for token swapping
    },
    addLiquidity: async (params) => {
      // Implementation for adding liquidity
    },
    // Market data functions
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

## 🔄 **Implementation Timeline**

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

## 🔧 **Troubleshooting**

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

## ✅ **Health Checks**

After implementation, verify:

- [ ] Responsive design works on mobile devices (320px-428px width)
- [ ] Touch controls function properly on mobile devices
- [ ] Trading functionality works with test transactions
- [ ] Performance is acceptable on mid-range mobile devices
- [ ] All three app phases (Landing, Creation, Trading) are functional

**Your mobile-optimized SayWhat app with trading functionality is ready!** 🎉
