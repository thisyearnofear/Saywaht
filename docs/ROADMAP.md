# 🚀 Saywaht Product Roadmap

**Vision:** To democratize video commentary by transforming content into tradeable assets. We bridge the gap between creativity and the crypto economy, enabling creators to "Coin Their Commentary" on the Zora network.

## 🌟 Strategic Pillars

1.  **Creator Studio Excellence**: A professional-grade, mobile-first video editor in the browser.
2.  **Economic Engine**: Deep, seamless integration with the Zora Protocol and Base network.
3.  **Discovery & Community**: Social-first distribution and viral mechanics via Farcaster.

---

## 🛠️ Feature Roadmap

### ✅ Phase 1: Creator Studio & Core Infrastructure
**Goal:** Deliver a stable, high-performance editing experience on mobile and desktop.

*   ✅ **Advanced Timeline Editor**
    *   Multi-track video/audio support
    *   Frame-perfect seeking and scrubbing
    *   **Smooth Ingest**: Eager ingestion of templates to local RAM for zero-lag editing.
*   ✅ **Wallet Architecture**
    *   Robust Wagmi/RainbowKit v2 integration
    *   Zora Chain (Base) compatibility
*   ✅ **Export Engine**
    *   Browser-native video rendering with FFmpeg-lite optimization.
    *   **Strict 10s Performance Cap**: Optimized for decentralized mobile storage.
*   ✅ **Mobile Experience Overhaul**
    *   **Draggable Drawers**: native-feeling tool panels using `vaul`.
    *   **Sync Start Slider**: Advanced audio/video alignment for commentary.
    *   **Touch Drag-and-Drop**: Interactive text positioning on preview.

### 🚀 Phase 2: The Economy (Current Focus)
**Goal:** Leverage the full power of the `@zoralabs/coins-sdk` for a rich trading experience.

*   🚧 **Advanced Trading Interface**
    *   Real-time price charts and volume metrics
    *   Integration of `tradeCoin` for seamless swaps
*   **Smart Metadata System**
    *   Strict adherence to `validateMetadataJSON` standards
    *   On-chain attribution for commentary remixes

### 🔍 Phase 3: Discovery & Social Graph (Current Focus)
**Goal:** Drive organic growth through social discovery and personalized feeds.

*   **Farcaster Native Integration**
    *   **Frame-to-Mint**: Directly mint coins from within a Cast.
    *   Interactive Farcaster Frames for trading within feeds.
*   **Intelligent Discovery Feed**
    *   Algorithmic sorting using `getCoinsNew` (Trending, New, Top Volume).

### 🔮 Phase 4: Future Horizons
**Goal:** Scale the platform for enterprise and power users.

*   **Advanced Monetization**: Splits, collaborative revenue sharing, and tipping.
*   **AI-Assisted Workflow**: Auto-captioning, scene detection, and smart trimming.
*   **Cross-Chain Expansion**: Bridging assets to Mainnet and L2s beyond Base.

---

## 🔧 Engineering Standards & Principles

To maintain velocity and stability, we adhere to strict engineering principles:

*   **Clean Architecture**: Separation of UI, Business Logic (SDKs), and Data.
*   **Type Safety**: Full TypeScript coverage, especially for Zora SDK interactions.
*   **Performance First**:
    *   Strict bundle size budgets.
    *   Optimized media loading (lazy hydration).
    *   Core Web Vitals monitoring (LCP, FID, CLS).
*   **Mobile First**: All features are designed for touch interfaces *before* desktop.

---

*Last Updated: Current Version*