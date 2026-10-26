# 🚀 Saywaht Product Roadmap

**Vision:** Turn your audience's questions and existing footage into captioned video responses, ready to publish.

Saywaht is proposed as a focused creator response/repurposing studio: a mobile-first editor that helps creators answer audience questions with trimmed, captioned video built from footage they already own or have licensed. Zora is the first integration and distribution channel — not the sole business.

**Status of this direction:** This is a *proposed* direction that still requires creator validation. It is not a proven wedge, and no user adoption is claimed.

## 🌟 Strategic Pillars

1.  **Creator Response Studio**: A professional-grade, mobile-first video editor in the browser, oriented around turning existing footage and audience questions into publishable captioned responses.
2.  **Zora Integration (first channel)**: Deep, correct integration with the Zora Protocol and Base network as the first distribution/monetization rail — pending the audit below.
3.  **Validation Before Expansion**: Real creator usage evidence drives what gets built next; deferred breadth (trading dashboards, multichain, autonomous agents) until the workflow proves out.

---

## Strategy & Research Review — October 1, 2026

This section records a research review of Zora's current platform state, SDK surface, and Saywaht's existing integration. Findings below are primary-source findings, code observations, and separately labeled secondary reports; they are not evidence of adoption, market demand, or competitive whitespace.

### Research findings

- **SDK version reconciliation** [7,8]: npm `latest` and this repository's lockfile are both `@zoralabs/coins-sdk` **0.8.0** (npm release July 16, 2026). The work required is integration *reconciliation* against that version, not an assumed package upgrade. Snapshot date: October 1, 2026. No installed `node_modules` runtime was checked.
- **Zora platform updates** [1]: livestreaming and automatic archives shipped November 2025; publishing archived livestream recordings January 2026; tags/trends March 2026; agent trading available to all users July 2026; Custom Pairs and multichain support (Base, Solana, Robinhood) August 2026. These are product feature announcements — not evidence of adoption or SDK parity.
- **Coin economics are not uniform** [2,3]. Current documented standard creator/content coin fees: 1% total base fee — creator 0.5% of traded amount, platform 0.2%, trade referral 0.04%. Legacy/version/launch exceptions exist. Custom Pairs: creator 0.7% of traded amount, no platform or trade referral share. Trend Coins: no creator/platform/trade-referral share; protocol fee 0.01%. **Not all coins share the same economic model.**
- **Referral arithmetic (author's illustration, not a forecast)** [3,4]: standard platform referral fraction = 0.002 of eligible traded volume; $1M eligible traded volume → $2,000; $10,000 referral revenue requires $5M eligible traded volume. This arithmetic assumes the applicable fee schedule and that attribution applies. Note the distinction: the existing *platform* referral is sticky at coin creation, while *trade* referral applies per swap.
- **Ecosystem health signal (secondary, unverified)** [12]: Tavily retrieved a The Defiant summary reporting a CEO transition (Dee Goens replacing Jacob Horne), a team of fewer than 10, and Base deployment fees down ~99% YoY. The full article returned HTTP 403, so the underlying metric is **not verified**. Treat this as secondary reported evidence — not an independently confirmed measure of total adoption or current network activity. CoinMarketCap repeats of the same source are not independent corroboration. Token-price predictions and old hype statistics are deliberately excluded.
- **SDK surface (0.8.0)** [5,6,7,9]: `getProfileCoins`, `getProfileBalances`, `getProfileSocial`, `getCoinMergedComments` (0.8 includes onchain/backfilled/offchain comment feed), price history, wallet trade activity, livestream comments, smart-wallet variants, and a metadata `uploader`/`multiUploader`. **Caveat:** reading comments does not establish that the API supports posting linked video replies. Per the SDK changelog, creator coins are created through the Zora app; content coins can pair with an existing creator coin.
- **Docs/SDK skew exists** [7,10,11]: product docs and SDK docs/source can lag or disagree — e.g., the create enum still lists `CREATOR_COIN`, `CREATOR_COIN_OR_ZORA`, `ZORA`, `ETH`; trade docs are Base-only and still mention "smart wallet coming soon" where the changelog says otherwise. Do not promise Custom Pairs/multichain write access.

### Integration gaps (grounded in current code)

| Area | Code reference | Gap |
|------|----------------|-----|
| User portfolio | [`apps/web/src/lib/zora-coins.ts`](../apps/web/src/lib/zora-coins.ts) `getUserPortfolio` (lines 173–193) | Fetches `getProfile` then returns an empty portfolio — created coins/balances are not wired. |
| Creator analytics | [`apps/web/src/lib/zora-coins.ts`](../apps/web/src/lib/zora-coins.ts) lines 459–469 | Computes over a permanently-empty `coins` array with `volume * 0.5` as "creator revenue". Currently latent (returns empties) — not an assertion that users saw inflated payouts — but wrong if populated: it uses a volume proxy instead of authoritative reward data and bakes in a single fee model. |
| Coin page field mapping | [`apps/web/src/lib/coin-page.ts`](../apps/web/src/lib/coin-page.ts) `transformCoinNode` (lines 28–68) | Reads old top-level fields (`contentURI`, `image`, `creator`, etc.) versus the documented `mediaContent`/`tokenPrice`/`creatorProfile`/`uniqueHolders` shape. |
| API key boundary | `apps/web/src/lib/` Zora calls | Existing direct browser calls vs. server-side API-key routing need to be verified per call site — do not universally claim the integration is authenticated server-side. |

### Phased execution (all pending/proposed)

**Phase A — Integration audit & reconciliation**
- Pin the installed + locked `@zoralabs/coins-sdk` version; reconcile actual versioned types and representative read responses against docs.
- Establish an authenticated, server-only query boundary where appropriate.
- Fix mapping: media vs. metadata URI, token prices/currency, blocked flags, creator identity and linked wallets.
- Wire created coins, balances, and merged comments; use authoritative reward data (not a volume proxy).
- Verify publish/upload indexing and limits, creator eligibility, referral attribution, and the backend create-call contract.
- Add fixtures/read tests plus error, pagination, and blocked-content cases. No spending or trades without explicit approval.
- Do not assume an indexer means all app features are supported.

**Phase B — Creator pilot**
- Recruit a handful of active Zora creators who already answer audience questions.
- Workflow: import existing posts/comments → choose a question → record or import user-owned/licensed footage (manual archive upload first; no unverified archive-download API) → trim and generate local captions → explicit source attribution → mobile-first → preserve the original → creator approves the output.
- Do not gate recording/local editing on coin ownership or purchase.

**Phase C — Publishing handoff**
- Metadata builder; evaluate Zora `uploader`/`multiUploader` alongside the existing decentralized storage path.
- Export/share a watchable page; optional human-signed content-coin publishing, using an existing creator coin when applicable; verify eligibility/paths for anything unsupported.
- Source relationship maintained in Saywaht initially (the prior "on-chain remix attribution" claim is **unverified** — see historical section).
- Native Zora reply-feed placement remains unverified. Coin ownership does not itself grant copyright, remix licenses, or revenue-sharing rights.
- Keep output reusable for other channels — Zora is the first channel, not the only one.

**Phase D — Validation**
- Record whether creators actually publish, return without prompting or subsidized/speculative incentives, and prefer this workflow over their existing tools.
- Compare against a manual baseline and observed bottlenecks. Agree success criteria after observing the baseline; willingness to pay is not established.
- Continue only on actual evidence; no fixed go/no-go numbers have been agreed.
- Referral revenue is supplementary; willingness to pay is explored separately, with no set pricing or revenue forecast.

### Explicitly deferred

- Generic trading/dashboard expansion
- Own social-network cold start
- Autonomous financial agents
- Multichain support
- Orbis as a core dependency [13–16] — the **Orbis Live Director** is a separate optional experiment/challenge path, not an implementation commitment; its real-time-steering test is a different question than the creator workflow. Cloud inputs need consent; paid GPU sessions need caps, scoped tokens, and termination; 24h recordings would need our own storage if reconsidered. The intended architecture is generative model → saved ordinary media, not a timeline replacement. No claim that Orbis is implemented.

### Framing (interpretations, not established facts)

- **PG — "make something people want":** repeated creator love for the response workflow comes first; everything else follows from that evidence.
- **Thiel — defensibility:** if any moat exists it would come from the directing/response workflow and community relationships — not from SDK/API access or tokenization, which are tools anyone can use, not a moat.
- Research cannot establish market demand or competitive whitespace; only the pilot can.

### Sources

| # | Source |
|---|--------|
| 1 | [Zora platform updates](https://support.zora.co/en/articles/4641857) |
| 2 | [Zora rewards (incl. Custom Pairs)](https://support.zora.co/en/articles/2509953) |
| 3 | [Coins contract rewards](https://docs.zora.co/coins/contracts/rewards) |
| 4 | [Earning referral rewards](https://docs.zora.co/coins/contracts/earning-referral-rewards) |
| 5 | [SDK profile queries](https://docs.zora.co/coins/sdk/queries/profile) |
| 6 | [SDK coin queries](https://docs.zora.co/coins/sdk/queries/coin) |
| 7 | [coins-sdk changelog](https://github.com/ourzora/zora-protocol/blob/main/packages/coins-sdk/CHANGELOG.md) |
| 8 | [@zoralabs/coins-sdk on npm](https://www.npmjs.com/package/@zoralabs/coins-sdk) (latest verified via `npm view`) |
| 9 | [SDK metadata builder](https://docs.zora.co/coins/sdk/metadata-builder) |
| 10 | [SDK create coin](https://docs.zora.co/coins/sdk/create-coin) |
| 11 | [SDK trade coin](https://docs.zora.co/coins/sdk/trade-coin) |
| 12 | [The Defiant — Zora CEO transition](https://thedefiant.io/news/defi/zora-co-founder-dee-goens-replaces-jacob-horne-as-ceo) (summary only; full article inaccessible, unverified) |
| 13 | [Orbis (Visko) model API reference](https://docs.reactor.inc/model-api-reference/visko-orbis-stable/overview.md) |
| 14 | [Reactor authentication](https://docs.reactor.inc/authentication.md) |
| 15 | [Reactor billing](https://docs.reactor.inc/resources/billing.md) |
| 16 | [Reactor recordings](https://docs.reactor.inc/concepts/recordings.md) |
| 17 | [Orbis challenge — September 2026](https://www.visko.ai/challenge/orbis-september-2026) |

---

## 🛠️ Historical feature roadmap (March 2026)

> **Caveat:** The phases below reflect the state of the roadmap as last edited in March 2026. Completion markers are **historical claims, not freshly audited statuses** — they have not been re-verified against the current codebase or the current SDK. In particular, the "on-chain attribution for commentary remixes" claim is **unverified**; the new plan initially stores source links in Saywaht rather than asserting onchain remix attribution.

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
    *   **Per-clip Loading Indicators**: Real-time feedback for streaming media buffering.
    *   **Undo/Redo Feedback**: Toast notifications for history actions.

### ✅ Phase 2: The Economy
**Goal:** Leverage the full power of the `@zoralabs/coins-sdk` for a rich trading experience.

*   ✅ **Advanced Trading Interface**
    *   Real-time video discovery and creator cards.
    *   Full `TradingFeed` component with search and algorithmic sorting.
*   ✅ **Simplified Minting Flow**
    *   Collapsed 3-step mobile minting (Details → Preview → Deploy).
    *   Auto-detection of video formats and smart defaults.
*   **Smart Metadata System**
    *   Strict adherence to `validateMetadataJSON` standards
    *   On-chain attribution for commentary remixes — *claimed March 2026, unverified; see caveat above*

### ✅ Phase 3: Discovery & Social Graph
**Goal:** Drive organic growth through social discovery and personalized feeds.

*   ✅ **Farcaster Native Integration (Mini App)**
    *   **Full Mini App Experience**: Seamless transition between editor, templates, and trading within Warpcast.
    *   **Hash-based Navigation**: Pure WebView-compatible routing system.
    *   **Template-first Entry**: Streamlined funnel for new users to start from curated content.
*   ✅ **Intelligent Discovery Feed**
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

*Last Updated: October 1, 2026 — strategy & research review*
