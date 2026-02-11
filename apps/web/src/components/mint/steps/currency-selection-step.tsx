"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from "@/lib/icons";
import { useAccount } from "wagmi";
import { getProfile } from "@zoralabs/coins-sdk";
import { MintWizardData } from "../mint-wizard";

interface CurrencySelectionStepProps {
    data: MintWizardData;
    updateData: (updates: Partial<MintWizardData>) => void;
}

interface CreatorCoinInfo {
    address: string;
    marketCap: string;
    marketCapDelta24h: string;
}

export function CurrencySelectionStep({ data, updateData }: CurrencySelectionStepProps) {
    const { address } = useAccount();
    const [isLoading, setIsLoading] = useState(true);
    const [creatorCoin, setCreatorCoin] = useState<CreatorCoinInfo | null>(null);
    const [profileHandle, setProfileHandle] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch user's profile and creator coin info
    useEffect(() => {
        if (!address) return;

        const fetchProfile = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await getProfile({ identifier: address });
                const profile: any = response?.data?.profile;

                if (profile) {
                    setProfileHandle(profile.handle || null);

                    if (profile.creatorCoin?.address) {
                        setCreatorCoin({
                            address: profile.creatorCoin.address,
                            marketCap: profile.creatorCoin.marketCap || "0",
                            marketCapDelta24h: profile.creatorCoin.marketCapDelta24h || "0",
                        });
                        // User has Creator Coin - use it
                        updateData({ currency: "CREATOR_COIN" });
                    } else {
                        // No Creator Coin - default to ZORA
                        updateData({ currency: "ZORA" });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch profile:", err);
                setError("Failed to load profile information");
                // Default to ZORA on error
                updateData({ currency: "ZORA" });
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [address, updateData]);

    const formatMarketCap = (marketCap: string) => {
        const value = parseFloat(marketCap);
        if (value >= 1000000) {
            return `$${(value / 1000000).toFixed(2)}M`;
        } else if (value >= 1000) {
            return `$${(value / 1000).toFixed(2)}K`;
        }
        return `$${value.toFixed(2)}`;
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Checking Your Creator Profile</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Loading your Zora profile information...
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Backing Currency Confirmed</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Your content coin will be paired with the following currency
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                                    {error}
                                </p>
                                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                    Defaulting to ZORA currency
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Show what currency will be used */}
                {creatorCoin ? (
                    <div className="p-6 rounded-lg border-2 border-primary bg-primary/5">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-6 h-6 text-primary" />
                                    <h3 className="text-lg font-semibold">Your Creator Coin</h3>
                                    <Badge variant="default" className="text-xs">
                                        Optimal Choice
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Your content coin will be paired with your Creator Coin {profileHandle && `($${profileHandle})`}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-background/50 rounded-lg">
                            <div>
                                <span className="text-xs text-muted-foreground">Market Cap</span>
                                <p className="text-lg font-semibold">{formatMarketCap(creatorCoin.marketCap)}</p>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground">24h Change</span>
                                <p className={`text-lg font-semibold ${parseFloat(creatorCoin.marketCapDelta24h) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {parseFloat(creatorCoin.marketCapDelta24h) >= 0 ? '+' : ''}
                                    {parseFloat(creatorCoin.marketCapDelta24h).toFixed(2)}%
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm">
                            <p className="font-medium text-primary">Why this is great:</p>
                            <ul className="space-y-1 text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">✓</span>
                                    <span>Aligns all your content with your creator economy</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">✓</span>
                                    <span>Reduces slippage risk for your community</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-primary mt-0.5">✓</span>
                                    <span>Strengthens your creator brand and token value</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 rounded-lg border-2 border-border bg-muted/30">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle className="w-6 h-6 text-muted-foreground" />
                                    <h3 className="text-lg font-semibold">ZORA Token</h3>
                                    <Badge variant="secondary" className="text-xs">
                                        Default
                                    </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Your content coin will be paired with the ZORA protocol token
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm mb-4">
                            <ul className="space-y-1 text-muted-foreground">
                                <li className="flex items-start gap-2">
                                    <span className="text-muted-foreground mt-0.5">✓</span>
                                    <span>Widely available and liquid</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-muted-foreground mt-0.5">✓</span>
                                    <span>Standard option for most creators</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="text-muted-foreground mt-0.5">✓</span>
                                    <span>No Creator Coin required</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
                                        Want to use your own Creator Coin?
                                    </p>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                                        Create a Creator Coin on Zora to pair all your content coins with your personal token.
                                    </p>
                                    <a
                                        href="https://support.zora.co/en/articles/6338433"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                                    >
                                        Learn how to create a Creator Coin
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Info about the pairing */}
                <div className="bg-muted/50 border border-border rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium mb-1">About Currency Pairing</p>
                            <p className="text-xs text-muted-foreground">
                                Your content coin will be paired with {creatorCoin ? 'your Creator Coin' : 'ZORA'} in a Uniswap V4 liquidity pool.
                                This determines what traders use to buy and sell your coin. {creatorCoin ? 'Using your Creator Coin creates a unified economy across all your content.' : 'ZORA is the standard pairing for creators without a Creator Coin.'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
