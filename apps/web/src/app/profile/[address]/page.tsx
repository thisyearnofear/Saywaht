"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Trophy, 
  Target, 
  Globe, 
  Zap, 
  TrendingUp, 
  Wallet, 
  Share2,
  ExternalLink,
  ShieldCheck,
  Clock,
  Award,
  Bot,
  Coins
} from "lucide-react";
import { useMissionStore, AVAILABLE_MISSIONS } from "@/services/mission-service";
import { getZoraCoins } from "@/lib/zora-coins";
import { useFarcasterShare } from "@/farcaster/hooks/use-farcaster-share";
import { toast } from "sonner";
import { AgentDashboard } from "@/components/agent/agent-dashboard";

export default function ProfilePage() {
  const { address } = useParams();
  const { 
    level, 
    currentXp, 
    nextLevelXp, 
    streakDays, 
    completedMissionIds, 
    resetDailyMissions,
    fetchProgress 
  } = useMissionStore();
  const { shareToFarcaster } = useFarcasterShare();

  const [zoraStats, setZoraStats] = useState({
    rewards: "0.000",
    trendingTopic: "...",
    marketSentiment: "neutral"
  });
  const [myCoins, setMyCoins] = useState<
    Array<{ address: string; name: string; symbol: string; thumbnailUrl?: string; createdAt: string }>
  >([]);
  const [loadingCoins, setLoadingCoins] = useState(false);

  // Load external stats and sync progress
  useEffect(() => {
    if (!address) return;
    const userAddress = String(address).toLowerCase();

    // 1. Sync Mission Progress from DB
    fetchProgress(userAddress);

    // 2. Reset daily missions if it's a new day
    resetDailyMissions();

    const fetchStats = async () => {
      try {
        const coinsService = getZoraCoins();
        const insights = await coinsService.getMarketInsights();
        const rewards = await coinsService.getRewardsBalance(userAddress);

        setZoraStats({
          rewards,
          trendingTopic: insights.trendingTopics[0] || "Crypto",
          marketSentiment: insights.marketSentiment
        });
      } catch (e) {
        console.error("Failed to load stats", e);
      }
    };
    fetchStats();

    // 3. Fetch the user's deployed coins from the platform DB
    //    (the same /api/coins writes that feed the discovery feed).
    const fetchMyCoins = async () => {
      setLoadingCoins(true);
      try {
        const { fetchPlatformCoins } = await import("@/lib/coins-cache");
        const all = await fetchPlatformCoins();
        const mine = all
          .filter((c) => c.creatorAddress?.toLowerCase() === userAddress)
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMyCoins(mine);
      } catch (e) {
        console.error("Failed to load user coins", e);
      } finally {
        setLoadingCoins(false);
      }
    };
    fetchMyCoins();
  }, [address, fetchProgress, resetDailyMissions]);

  const handleShareProfile = () => {
    // Construct a shareable text
    const text = `I'm Level ${level} on Saywaht! 🎬\n\nCurrent Streak: ${streakDays} days 🔥\nXP: ${currentXp}/${nextLevelXp} ✨\n\nCome coin your commentary!`;
    // We pass a dummy 'blob' for now as the hook expects one, but in text-only mode 
    // we might need to adjust the hook or just use the text. 
    // For this MVP, we'll just simulate the share intent.
    console.log("Sharing profile:", text);
    toast.success("Profile share ready!");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-70"></div>
            <Avatar className="w-24 h-24 border-4 border-background relative">
              <AvatarImage src={`https://effigy.im/a/${address}.png`} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Badge className="absolute -bottom-2 -right-2 px-2 py-1 bg-primary text-white border-2 border-background">
              Lvl {level}
            </Badge>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold font-mono tracking-tight flex items-center justify-center md:justify-start gap-2">
              {String(address).slice(0, 6)}...{String(address).slice(-4)}
              {level >= 5 && <ShieldCheck className="w-5 h-5 text-blue-400" />}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Saywaht Creator • Joined 2024
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-3">
              <Badge variant="outline" className="gap-1.5">
                <Zap className="w-3 h-3 text-yellow-500" />
                {currentXp} XP
              </Badge>
              <Badge variant="outline" className="gap-1.5">
                <TrendingUp className="w-3 h-3 text-green-500" />
                {streakDays} Day Streak
              </Badge>
            </div>
          </div>

          <Button onClick={handleShareProfile} className="w-full md:w-auto gap-2">
            <Share2 className="w-4 h-4" />
            Share Profile
          </Button>
        </div>

        {/* Level Progress */}
        <Card className="mb-8 border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span>Level {level}</span>
              <span className="text-muted-foreground">{currentXp} / {nextLevelXp} XP</span>
            </div>
            <Progress value={(currentXp / nextLevelXp) * 100} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Create commentaries and complete missions to level up!
            </p>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-8">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="coins">My Coins</TabsTrigger>
            <TabsTrigger value="missions">Missions</TabsTrigger>
            <TabsTrigger value="agent" className="flex items-center gap-1">
              <Bot className="w-3 h-3" />
              Agent
            </TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>

          {/* AGENT TAB */}
          <TabsContent value="agent" className="space-y-6">
            <AgentDashboard />
          </TabsContent>

          {/* MY COINS TAB — closes the create→own loop on the profile.
              Fed by the existing /api/coins writes (same source as the
              discovery feed). Each coin links to the canonical /coin/[address]
              page where it can be viewed, shared, and traded. */}
          <TabsContent value="coins" className="space-y-4">
            {loadingCoins ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading your coins...</p>
              </div>
            ) : myCoins.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center">
                  <Coins className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">No coins yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Create your first commentary coin to see it here.
                  </p>
                </div>
                <Link href="/templates">
                  <Button>Create a Coin</Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCoins.map((coin) => (
                  <Link key={coin.address} href={`/coin/${coin.address}`}>
                    <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                      <CardContent className="p-4 space-y-3">
                        <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                          {coin.thumbnailUrl ? (
                            <img
                              src={coin.thumbnailUrl}
                              alt={coin.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <Coins className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold truncate">{coin.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            ${coin.symbol} · {new Date(coin.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          {/* DASHBOARD TAB */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Earnings Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Wallet className="w-4 h-4" /> Protocol Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold flex items-baseline gap-1">
                    {zoraStats.rewards} <span className="text-sm font-normal text-muted-foreground">ETH</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Earned from mints & splits on Zora
                  </p>
                  <Button variant="outline" size="sm" className="w-full mt-4 gap-2">
                    <ExternalLink className="w-3 h-3" />
                    Claim on Zora
                  </Button>
                </CardContent>
              </Card>

              {/* Achievements Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4" /> Recent Badges
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    {level >= 1 && (
                      <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-xl border border-yellow-500/50" title="First Steps">
                        🚀
                      </div>
                    )}
                    {streakDays >= 3 && (
                      <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-xl border border-red-500/50" title="On Fire">
                        🔥
                      </div>
                    )}
                    {/* Placeholder for empty slots */}
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border border-dashed">
                      ?
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* MISSIONS TAB */}
          <TabsContent value="missions" className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Active Missions
              </h2>
              <Badge variant="secondary">
                {AVAILABLE_MISSIONS.length - completedMissionIds.length} Available
              </Badge>
            </div>

            {AVAILABLE_MISSIONS.map((mission) => {
              const isCompleted = completedMissionIds.includes(mission.id);
              return (
                <Card key={mission.id} className={`transition-all ${isCompleted ? 'opacity-60 bg-muted/50' : 'hover:border-primary/50'}`}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-background border flex items-center justify-center text-2xl shadow-sm">
                      {mission.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">{mission.title}</h3>
                        {isCompleted && <Badge className="bg-green-500 text-[10px]">COMPLETED</Badge>}
                        {mission.type === 'daily' && !isCompleted && <Badge variant="outline" className="text-[10px]">DAILY</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{mission.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">+{mission.xpReward} XP</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* NETWORK TAB */}
          <TabsContent value="network" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-blue-500" />
                  Ecosystem Pulse
                </CardTitle>
                <CardDescription>Live stats from the Base & Zora network</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Market Sentiment
                  </span>
                  <Badge variant={zoraStats.marketSentiment === 'bullish' ? 'default' : 'secondary'}>
                    {zoraStats.marketSentiment.toUpperCase()}
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Trending Topic
                  </span>
                  <span className="font-mono font-bold">#{zoraStats.trendingTopic}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Base Block Time
                  </span>
                  <span className="font-mono">2s</span>
                </div>
              </CardContent>
            </Card>
            
            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-center">
              <p className="text-sm text-blue-400 font-medium">
                You are connected to Base Mainnet
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
