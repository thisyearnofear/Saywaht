# Saywaht in the Agentic Era

## The secret (Thiel)

*What valuable company is nobody building?* Everyone is wiring agents to
chat, code, and commerce. Almost nobody is wiring agents to **media** — yet
the next marginal consumer, payer, and creator of video is a machine, not a
human with thumbs.

Saywaht's contrarian bet: **the audience for content is no longer only
human.** An agent can watch (transcribe), judge (market signals), pay (x402 +
Base), and publish (deploy a commentary coin) without ever opening the app's
UI. The app that is first *legible to agents* inherits that demand curve the
way Zora inherited the creator wave.

The existing moat is real: a working video editor, Grove/IPFS media pipeline,
Zora protocol integration with platform referrals, a Farcaster mini-app
surface. What it lacked was any agent-readable surface. That is now fixed.

## Make something people (and their agents) want (PG)

- **Do things that don't scale, safely.** The deterministic goal planner
  recognizes real intents (buy/sell/create/scan) rather than hallucinating a
  general brain. Ship the working 20%, let usage teach the other 80%.
- **Users are sovereign.** Agents propose, humans dispose. Every fund-moving
  or publishing tool halts at an approval gate and returns *sign-ready
  calldata*; the agent never holds the user's keys. Policy ceilings
  (0.01 ETH/mission, 0.005 ETH/trade) are defaults, not suggestions.
- **Default alive.** Platform referral on every agent-created coin and the
  existing reward rails mean autonomous usage compounds platform revenue
  without asking permission from a human on the other side of each trade.

## What was built

### 1. Latest Zora protocol primitives (`@zoralabs/coins-sdk` 0.3.3 → 0.8.0)
- Quote-first trading: `createQuote` prices exact `amountOut` before any
  signature (`use-trading.ts`, agent `quote_trade`/`trade_coin` tools).
- `createCoinCall` with `platformReferrer`, `payoutRecipientOverride`, and
  `CREATOR_COIN_OR_ZORA` backing (content coins unified with creator coins).
- Smart-account (ERC-4337) paths available for fully autonomous agent
  wallets: `createCoinSmartWallet`, `tradeCoinSmartWallet`,
  `updateCoinURISmartWallet`, `prepareUserOperation`/`submitUserOperation`.
- `updateCoinURI` / `updatePayoutRecipient` for post-publish management.
- Server-side `setApiKey` support (`ZORA_API_KEY`) for higher rate limits.

### 2. Agent core (`apps/web/src/agent/`)
- `types.ts` — identity, tools, policy, missions, x402 type contract.
- `identity.ts` — wallet-key identity (no accounts), A2A-style agent card.
- `tools.ts` — nine schema-described tools wrapping the editor + protocol.
- `runtime.ts` — mission engine: plan → policy gate → approval halt →
  audit log. In-memory today; the interface is DB-ready.
- `x402.ts` — HTTP 402 paywall for premium agent endpoints, verified
  onchain on Base (opt-in: `NEXT_PUBLIC_X402_ENABLED=1`).

### 3. Agent surface
- `/.well-known/agent-card.json` — machine-readable discovery (rewritten to
  `/api/agent-card.json`).
- `/api/mcp` — Model Context Protocol server (JSON-RPC; `initialize` /
  `tools/list` / `tools/call`). Any MCP client — Claude, OpenAI Agents SDK,
  LangChain — can drive Saywaht as a tool.
- `/api/agent/run` — JSON-RPC mission API (`mission.run`,
  `mission.approve`, `activity.list`, premium `tool.call`).
- Profile → Agent tab: live dashboard with goal runner, approval queue,
  mission history, activity log.

## Verification (run against dev server)

- MCP `initialize` + `tools/list` → 9 tools advertised.
- `mission.run "scan the commentary coin market"` → done, live Zora market
  data (sentiment bullish, 10 gainers).
- `mission.run "buy 0.001 ETH of <coin>"` → `quote_trade` executed with a
  live quote, `trade_coin` halted at `awaiting_approval`. Resumable via
  `mission.approve`.
- `tsc --noEmit`: zero errors in all agent-layer and touched files.

## Next moves

1. Persist missions/activity in `packages/db`; add ERC-8004-style onchain
   registration for agent reputation.
2. Wire a dedicated agent smart wallet (Coinbase Smart Wallet exists in this
   repo's connectors) so opted-in users get true autonomy within policy caps.
3. Editor co-pilot: expose timeline/canvas stores as MCP tools so external
   agents can *edit*, not just publish.
4. LLM planner behind the same policy gate (planner is swappable; the gate
   is not).
