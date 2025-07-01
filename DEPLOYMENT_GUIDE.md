# 🚀 OpenCut Deployment Guide

## Quick Setup for Demo/Development

### 1. **Clone and Install**
```bash
git clone <your-repo>
cd OpenCut
bun install
```

### 2. **Environment Setup**
Create `apps/web/.env.local`:
```bash
# Required - Database
DATABASE_URL=postgresql://user:pass@localhost:5432/opencut

# Required - Auth
BETTER_AUTH_SECRET=your-256-bit-secret-key
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Optional - Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Required for FilCDN (Hackathon Feature)
NEXT_PUBLIC_FILECOIN_PRIVATE_KEY=your-filecoin-private-key
NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS=0xYourWalletAddress

# Optional - Enhanced features
ELEVENLABS_API_KEY=your-elevenlabs-key
NEXT_PUBLIC_ZORA_API_KEY=your-zora-api-key
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

### 4. **Database Setup**
```bash
# Start local PostgreSQL (or use your preferred method)
# Using Docker:
docker run -d \
  --name opencut-postgres \
  -e POSTGRES_USER=opencut \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=opencut \
  -p 5432:5432 \
  postgres:17

# Push database schema
cd apps/web
bun run db:push:local
```

### 5. **Start Development**
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
DATABASE_URL=postgresql://opencut:your-secure-password@db:5432/opencut

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

## 🔧 **Troubleshooting**

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

After deployment, verify:
- [ ] http://localhost:3000 loads
- [ ] http://localhost:3000/api/health returns OK
- [ ] FilCDN tab appears in editor media panel
- [ ] Discovery feed loads (with fallback if no coins)
- [ ] Mint page opens and connects wallet
- [ ] Database connection works (can create projects)

**Your hackathon-ready OpenCut deployment is complete!** 🎉
