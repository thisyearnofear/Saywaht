"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bot,
  Activity,
  ShieldCheck,
  RefreshCcw,
  Play,
  Check,
  X,
  Terminal,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAccount } from "wagmi";

/**
 * AgentDashboard — control surface for the in-process agent runtime.
 *
 * Self-hosted by design: the agent's identity is the user's own Base wallet,
 * tools run against the latest Zora protocol primitives, and every mutating
 * action halts here for a human click. No external custody, no CLI bridge.
 */

interface MissionCall {
  id: string;
  tool: string;
  status: string;
  output?: unknown;
  error?: string;
}

interface Mission {
  id: string;
  goal: string;
  status: string;
  calls: MissionCall[];
  updatedAt: number;
  spentWei: string;
  initiator: string;
}

interface ActivityItem {
  id: string;
  ts: number;
  kind: string;
  message: string;
}

interface SetupState {
  active: boolean;
  agent: {
    name: string;
    version: string;
    x402: boolean;
    endpoints: { run: string; mcp: string; agentCard: string };
    card?: { skills?: { id: string }[] };
  };
  missions: Mission[];
  activity: ActivityItem[];
}

const statusColor: Record<string, string> = {
  done: "text-green-500",
  running: "text-blue-500",
  awaiting_approval: "text-amber-500",
  failed: "text-red-500",
  rejected: "text-red-500",
  planning: "text-muted-foreground",
};

export function AgentDashboard() {
  const { address } = useAccount();
  const [state, setState] = useState<SetupState | null>(null);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/setup");
      if (res.ok) setState(await res.json());
    } catch (e) {
      console.error("agent status fetch failed", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rpc = async (method: string, params: Record<string, unknown> = {}) => {
    const res = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  };

  const runMission = async () => {
    if (!goal.trim()) return;
    setBusy("run");
    try {
      await rpc("mission.run", { goal: goal.trim() });
      setGoal("");
      toast.success("Mission executed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Mission failed");
    } finally {
      setBusy(null);
    }
  };

  const approve = async (missionId: string, callId: string) => {
    setBusy(callId);
    try {
      await rpc("mission.approve", { missionId, callId });
      toast.success("Approved — mission resumed");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Approval failed");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  const agent = state?.agent;
  const pending = (state?.missions || []).flatMap((m) =>
    m.calls
      .filter((c) => c.status === "awaiting_approval")
      .map((c) => ({ mission: m, call: c })),
  );

  return (
    <div className="space-y-6">
      {/* Identity + endpoints */}
      <Card className="bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              {agent?.name}
              <Badge variant="outline" className="ml-1">v{agent?.version}</Badge>
            </CardTitle>
            <CardDescription className="text-xs">
              Self-hosted agent runtime on Base. Your wallet key is the identity — nothing leaves this app.
            </CardDescription>
          </div>
          <Badge variant="outline" className="bg-background/50 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-green-500" />
            {agent?.x402 ? "x402 metered" : "Policy-gated"}
          </Badge>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <KeyRound className="w-3 h-3" />
            {address ? `Session key: ${address.slice(0, 10)}…${address.slice(-6)}` : "Connect wallet — your address is the agent's identity"}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {[agent?.endpoints.agentCard, agent?.endpoints.mcp, agent?.endpoints.run].map((p) => (
              <code key={p} className="bg-muted px-2 py-1.5 rounded truncate">{p}</code>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 pt-1">
            {(agent?.card?.skills || []).map((s) => (
              <Badge key={s.id} variant="secondary" className="text-[10px] font-mono">{s.id}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Goal runner */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Play className="w-4 h-4" /> Give the agent a goal
          </CardTitle>
          <CardDescription className="text-xs">
            e.g. "buy 0.001 ETH of 0x…", "create a commentary coin about X", or free text for a market scan.
            Mutating steps always pause for your approval below.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="goal…"
            onKeyDown={(e) => e.key === "Enter" && runMission()}
          />
          <Button onClick={runMission} disabled={busy === "run" || !goal.trim()}>
            {busy === "run" ? "Running…" : "Run mission"}
          </Button>
          <Button variant="outline" size="icon" onClick={refresh} aria-label="Refresh">
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Approval queue — PG: agents propose, humans dispose */}
      {pending.length > 0 && (
        <Card className="border-amber-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              Awaiting your approval ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pending.map(({ mission, call }) => (
              <div key={call.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium font-mono">{call.tool}</p>
                  <p className="text-xs text-muted-foreground truncate">{mission.goal}</p>
                </div>
                <Button size="sm" onClick={() => approve(mission.id, call.id)} disabled={busy === call.id}>
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Missions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Recent missions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(state?.missions || []).length === 0 && (
              <p className="text-xs text-muted-foreground">No missions yet.</p>
            )}
            {(state?.missions || []).map((m) => (
              <div key={m.id} className="p-3 rounded-lg border bg-card/50 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium truncate">{m.goal}</p>
                  <span className={`text-[10px] font-mono ${statusColor[m.status] || ""}`}>{m.status}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.calls.map((c) => (
                    <Badge key={c.id} variant="outline" className="text-[10px] font-mono">
                      {c.tool}
                      <span className={`ml-1 ${statusColor[c.status] || ""}`}>
                        {c.status === "done" ? "✓" : c.status === "failed" || c.status === "rejected" ? "✗" : "…"}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" /> Activity log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {(state?.activity || []).map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-xs py-1 border-b last:border-0">
                  <span className="text-muted-foreground font-mono whitespace-nowrap">
                    {new Date(a.ts).toLocaleTimeString()}
                  </span>
                  <Badge variant="secondary" className="text-[9px] px-1 shrink-0">{a.kind}</Badge>
                  <span className="break-all">{a.message}</span>
                </div>
              ))}
              {(state?.activity || []).length === 0 && (
                <p className="text-xs text-muted-foreground">Quiet so far.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
