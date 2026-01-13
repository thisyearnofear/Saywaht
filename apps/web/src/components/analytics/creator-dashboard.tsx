"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    TrendingUp,
    TrendingDown,
    Users,
    DollarSign,
    BarChart3,
    Sparkles,
    RefreshCw,
    Eye,
    Heart,
    MessageCircle,
    Share2,
} from "@/lib/icons";
import { zoraCoins, type VideoCoin } from "@/lib/zora-coins";
import { useWalletAuth } from "@opencut/auth";
import { motion } from "motion/react";

interface CreatorAnalytics {
    totalCoins: number;
    totalVolume: string;
    totalRevenue: string;
    avgCoinPerformance: number;
    topPerformingCoin: VideoCoin | null;
    recentActivity: Array<{
        type: 'mint' | 'trade' | 'revenue';
        timestamp: string;
        amount: string;
        coinAddress?: string;
    }>;
    audienceMetrics: {
        uniqueHolders: number;
        avgHoldingTime: number;
        retentionRate: number;
    };
}

export function CreatorDashboard() {
    const { user, isAuthenticated } = useWalletAuth();
    const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        if (!user?.address) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await zoraCoins.getCreatorAnalytics(user.address);
            setAnalytics(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load analytics');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated && user?.address) {
            fetchAnalytics();
        }
    }, [isAuthenticated, user?.address]);

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <BarChart3 className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Creator Analytics</h2>
                <p className="text-muted-foreground mb-4">
                    Connect your wallet to view your creator analytics
                </p>
                <Button onClick={() => (window.location.href = "/")}>
                    Connect Wallet
                </Button>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
                <RefreshCw className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading your analytics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Card className="border-red-200 bg-red-50/50">
                    <CardContent className="p-6 text-center">
                        <p className="text-red-600 mb-4">{error}</p>
                        <Button onClick={fetchAnalytics} variant="outline">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!analytics) return null;

    const formatCurrency = (value: string) => {
        const num = parseFloat(value);
        if (num >= 1000) {
            return `$${(num / 1000).toFixed(1)}K`;
        }
        return `$${num.toFixed(2)}`;
    };

    const formatPercentage = (value: number) => {
        const isPositive = value >= 0;
        return (
            <div className={`flex items-center gap-1 ${isPositive ? "text-green-500" : "text-red-500"}`}>
                {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                ) : (
                    <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-medium">
                    {isPositive ? "+" : ""}
                    {value.toFixed(1)}%
                </span>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">📊</span>
                        <h1 className="text-2xl font-bold">Creator Analytics</h1>
                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                            Commentary Coins
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">
                        Track your commentary coin performance and audience engagement
                    </p>
                </div>
                <Button onClick={fetchAnalytics} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Coins</CardTitle>
                            <Sparkles className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{analytics.totalCoins}</div>
                            <p className="text-xs text-muted-foreground">
                                Commentary coins created
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                            <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(analytics.totalVolume)}</div>
                            <p className="text-xs text-muted-foreground">
                                Trading volume generated
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</div>
                            <p className="text-xs text-muted-foreground">
                                Creator earnings (50% share)
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Avg Performance</CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatPercentage(analytics.avgCoinPerformance)}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                24h average change
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Top Performing Coin */}
            {analytics.topPerformingCoin && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                >
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <span className="text-xl">🏆</span>
                                Top Performing Commentary
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                {analytics.topPerformingCoin.thumbnail && (
                                    <img
                                        src={analytics.topPerformingCoin.thumbnail}
                                        alt={analytics.topPerformingCoin.name}
                                        className="w-16 h-16 rounded-lg object-cover"
                                    />
                                )}
                                <div className="flex-1">
                                    <h3 className="font-semibold text-lg">{analytics.topPerformingCoin.name}</h3>
                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <DollarSign className="h-4 w-4" />
                                            <span>{parseFloat(analytics.topPerformingCoin.price).toFixed(4)} ETH</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <BarChart3 className="h-4 w-4" />
                                            <span>{analytics.topPerformingCoin.volume24h} ETH volume</span>
                                        </div>
                                        {formatPercentage(analytics.topPerformingCoin.priceChange24h)}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Audience Metrics */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Audience Insights
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold text-primary">
                                    {analytics.audienceMetrics.uniqueHolders}
                                </div>
                                <p className="text-sm text-muted-foreground">Unique Holders</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold text-primary">
                                    {analytics.audienceMetrics.avgHoldingTime}d
                                </div>
                                <p className="text-sm text-muted-foreground">Avg Holding Time</p>
                            </div>
                            <div className="text-center p-4 bg-muted/50 rounded-lg">
                                <div className="text-2xl font-bold text-primary">
                                    {analytics.audienceMetrics.retentionRate}%
                                </div>
                                <p className="text-sm text-muted-foreground">Retention Rate</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Call to Action */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
            >
                <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
                    <CardContent className="p-6 text-center">
                        <h3 className="text-lg font-semibold mb-2">Ready to create more commentary?</h3>
                        <p className="text-muted-foreground mb-4">
                            Share your insights and reactions to grow your audience and earnings
                        </p>
                        <Button onClick={() => (window.location.href = "/editor")} className="bg-purple-600 hover:bg-purple-700">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Create New Commentary
                        </Button>
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}