# Saywaht in the Agentic Era

> **Canonical plan:** [ROADMAP.md](ROADMAP.md) is the canonical strategy document
> (October 1, 2026 research review). This file is supporting rationale for the
> agent-native surface; where they differ, the roadmap wins.

## The secret (Thiel) — a hypothesis, not an established fact

*What valuable company is nobody building?* One hypothesis is that
agent-readable media workflows could help creators turn audience context into
publishable responses. We have not established a distinct machine-audience
market or demand curve.

Saywaht exposes tools that can read market context and prepare
publishing/trading calls without opening the UI. Financial and publishing
actions still require human approval and a wallet signature; the agent
transcription tool currently returns only an acknowledgement. Being legible to
agents is useful infrastructure, not a guaranteed advantage.

The existing surface is real but is **not a moat**: a working video editor,
Grove/IPFS media pipeline, Zora protocol integration, a Farcaster mini-app
surface. These are tools anyone can build on. If defensibility exists, it would
come from the directing/response workflow and creator/community relationships —
per the roadmap's framing — not from SDK/API access or tokenization.

## Make something people (and maybe their agents) want (PG)

- **Do things that don't scale, safely.** The deterministic goal planner
  recognizes real intents (buy/sell/create/scan) rather than hallucinating a
  general brain. Ship the working 20%, let usage teach the other 80%.
- **Users are sovereign.** Agents propose, humans dispose. Every fund-moving
  or publishing tool halts at an approval gate and returns *sign-ready
  calldata*; the agent never holds the user's keys. Policy ceilings
  (0.01 ETH/mission, 0.005 ETH/trade) are defaults, not suggestions.
- **Referral economics — bounded, not "default alive".** A platform referral
  applies only to *applicable standard coins* (0.2% of traded amount under the
  current documented fee schedule); **Custom Pairs carry no platform or trade
  referral share** and Trend Coins none at all — see the roadmap's research
  review. Whether autonomous usage produces meaningful revenue is an open
  question, not a compounding guarantee.

## What was built

### 1. Zora protocol primitives (`@zoralabs/coins-sdk` 0.8.0 in lockfile)
- Quote-first trading: `createQuote` prices exact `amountOut` before any
  signature (`use-trading.ts`, agent `quote_trade`/`trade_coin` tools).
- `createCoinCall` with `platformReferrer`, `payoutRecipientOverride`, and
  `CREATOR_COIN_OR_ZORA` backing (content coins unified with creator coins).
- Smart-account (ERC-4337) paths are **available in the SDK**
  (`createCoinSmartWallet`, `tradeCoinSmartWallet`,
  `updateCoinURISmartWallet`, `prepareUserOperation`/`submitUserOperation`) —
  availability in the SDK is not the same as wired autonomous execution in
  this app; see the roadmap's integration audit phase.
- `updateCoinURI` / `updatePayoutRecipient` for post-publish management.
- Server-side `setApiKey` support (`ZORA_API_KEY`) for higher rate limits;
  which call sites actually route through the authenticated server path is
  part of the pending audit, not a settled claim.

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

### Known limitations of the current surface

- The agent `transcribe` tool returns a **queued acknowledgement**, not a real
  scheduling/execution pipeline (local browser captioning itself works).
- Smart-wallet *autonomous* execution is not wired end-to-end; the approval
  gate is the operative boundary today.
- On-chain remix attribution is **not verified as implemented** — the current
  plan stores source links in Saywaht (see ROADMAP).

## Verification (historical reported results — not rerun this session)

The following were reported run against a dev server previously; they have not
been re-verified in this review.

- MCP `initialize` + `tools/list` → 9 tools advertised.
- `mission.run "scan the commentary coin market"` → done, live Zora market
  data (sentiment bullish, 10 gainers).
- `mission.run "buy 0.001 ETH of <coin>"` → `quote_trade` executed with a
  live quote, `trade_coin` halted at `awaiting_approval`. Resumable via
  `mission.approve`.
- `tsc --noEmit`: zero errors in all agent-layer and touched files.

## Next moves (reprioritized — see ROADMAP for the canonical plan)

1. **Integration audit & reconciliation** (ROADMAP Phase A): verify the wired
   SDK surface against 0.8.0 reality — authenticated server boundary, coin
   field mapping, portfolio/balances/comments wiring, authoritative reward
   data. This gates everything else.
2. **Creator response pilot** (ROADMAP Phase B): a handful of active Zora
   creators using the editor to answer audience questions — evidence first.
3. Persist missions/activity in `packages/db`; agent timeline-editing tools
   and an LLM planner behind the same policy gate — *optional, later*.
4. Dedicated agent smart wallet within policy caps — *optional, later*.
5. Generic trading autonomy — **deferred** per the roadmap.
