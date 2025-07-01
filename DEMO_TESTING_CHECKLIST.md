# 🎯 Demo Testing Checklist

## Pre-Demo Setup (5 minutes)

### Environment Check
- [ ] `bun run dev` starts successfully
- [ ] App loads at http://localhost:3000
- [ ] No console errors on page load
- [ ] All environment variables set (especially FilCDN keys)

### FilCDN Wallet Check
- [ ] Metamask connected to Filecoin Calibration testnet
- [ ] Wallet has tFIL and USDFC tokens
- [ ] Payment setup completed at https://fs-upload-dapp.netlify.app
- [ ] Wallet address in `NEXT_PUBLIC_FILECOIN_WALLET_ADDRESS`

## 🚀 Demo Flow Testing (10 minutes)

### 1. Landing Page ✅
- [ ] Landing page loads with header
- [ ] "Get Started" or editor link works
- [ ] Discovery feed shows coins (or empty state)
- [ ] Connect wallet button appears

### 2. Editor Interface ✅
- [ ] Go to `/editor`
- [ ] Welcome screen appears (if no project)
- [ ] Click "Create New Project" 
- [ ] Editor interface loads with panels
- [ ] All components render (media panel, timeline, preview)

### 3. FilCDN Upload (Core Demo) ⭐
- [ ] FilCDN tab visible in media panel
- [ ] Can click on FilCDN tab
- [ ] Upload interface appears (if configured)
- [ ] OR setup guide appears (if not configured)
- [ ] Drag & drop area is responsive

**If FilCDN configured:**
- [ ] Upload small video file (<254MB)
- [ ] Progress bar appears
- [ ] Success message shows
- [ ] FilCDN URL displayed
- [ ] File appears in media items

### 4. Timeline Interaction ✅
- [ ] Can drag media to timeline
- [ ] Timeline shows added clips
- [ ] Playback controls work
- [ ] Can trim/move clips

### 5. Video Export ⭐
- [ ] Export button enabled (when content exists)
- [ ] Click export starts process
- [ ] Progress toast appears
- [ ] Download starts automatically
- [ ] .webm file downloads successfully

### 6. Minting Workflow ⭐
- [ ] Go to `/mint/project-id` (or click mint button)
- [ ] Connect wallet prompt
- [ ] Mint form appears
- [ ] Enter coin name and symbol
- [ ] FilCDN content summary shows (if FilCDN content exists)
- [ ] Metadata generation indicator works
- [ ] Mint button becomes enabled
- [ ] Can simulate transaction (don't need to complete)

### 7. Discovery Feed ✅
- [ ] Go to home page
- [ ] Connect wallet to see discovery feed
- [ ] Real Zora coins display (or empty state)
- [ ] Market data shows (cap, volume, etc.)
- [ ] UI is responsive and polished

## 🎪 Demo Script (2-3 minutes)

### **Opening (30s)**
> "This is OpenCut - a decentralized video commentary platform where users create memetic content and mint it as tradeable Zora coins. What makes it special is our FilCDN integration for blazing-fast content delivery."

### **FilCDN Demo (60s)**
1. **Show editor**: "Here's our video editor interface"
2. **Show FilCDN tab**: "Notice the FilCDN option for decentralized storage"
3. **Upload file**: "When I upload content, it creates a Filecoin PDP deal..."
4. **Show FilCDN URL**: "...and gives us a low-latency CDN URL for instant retrieval"
5. **Add to timeline**: "The content loads instantly in our editor thanks to FilCDN"

### **Export Demo (30s)**
1. **Show export**: "Users can export their compositions..."
2. **Show progress**: "The system renders video using FilCDN content"
3. **Download**: "And download the final result"

### **Zora Integration (30s)**
1. **Show mint page**: "Then they can mint their commentary as a Zora coin"
2. **Show metadata**: "Notice how the metadata includes FilCDN URLs and storage info"
3. **Show discovery**: "All coins appear in our discovery feed with real market data"

### **Closing (30s)**
> "So we've built exactly what the hackathon asked for - a low-latency application using PDP and FilCDN, integrated with a real-world use case of memetic commentary trading on Zora."

## ⚠️ Fallback Plans

### If FilCDN Upload Fails:
- Show the setup guide: "Here's how users would configure FilCDN"
- Use local upload instead: "For demo purposes, I'll use local files"
- Explain the integration: "In production, this would use FilCDN"

### If Export Fails:
- Show the progress: "The system would normally render video here"
- Explain the technology: "Using HTML5 Canvas and MediaRecorder API"
- Show timeline data: "All the composition data is captured"

### If Zora API is Down:
- Show empty state: "This normally shows real Zora coins"
- Explain the integration: "We're using the official Zora Coins SDK"
- Show mint form: "The minting workflow is fully functional"

## 🎯 Key Points to Emphasize

1. **✅ PDP Integration**: "Creates Filecoin storage deals with proof of data possession"
2. **✅ CDN Performance**: "FilCDN enables instant content retrieval"
3. **✅ Real Zora Integration**: "Using actual Zora protocol for coin trading"
4. **✅ Production Ready**: "Full authentication, rate limiting, error handling"
5. **✅ Decentralized Stack**: "Filecoin storage + Zora trading + IPFS metadata"

## 🔧 Quick Fixes

### If something breaks:
1. **Refresh the page** - Most issues are state-related
2. **Check console** - Look for specific error messages
3. **Restart dev server** - `Ctrl+C` then `bun run dev`
4. **Use fallback demo** - Show UI without live functionality

### Emergency demo data:
- Sample FilCDN URL: `https://0xde946319e3dba67b58bd771de01af8accafcda9d.calibration.filcdn.io/baga...`
- Sample metadata: Show the generated JSON in console
- Sample Zora coins: Discovery feed has fallback data

**Total Demo Time: 3-5 minutes | Setup Time: 5 minutes | Buffer: 2 minutes**

## ✅ **Final Confidence Check**

Before demo:
- [ ] All checklist items pass ✅
- [ ] Demo script practiced once 🎪
- [ ] Fallback plans ready ⚠️
- [ ] Enthusiasm high! 🚀

**You've got this! The platform is solid and ready to showcase!** 🎉
