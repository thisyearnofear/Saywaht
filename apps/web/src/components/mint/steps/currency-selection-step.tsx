"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from "@/lib/icons";
import { useAccount } from "wagmi";
import { getProfile } from "@zoralabs/coins-sdk";
import { MintWizardData } from "../mint-wizard";
import Image from "next/image";

interface CurrencySelectionStepProps {
    data: MintWizardData;
    updateData: (updates: Partial<MintWizardData>) => void;
}

type CurrencyOption = "ZORA" | "CREATOR_COIN" | "ETH";

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
    const [selectedCurrency, setSelectedCurrency] = useState<CurrencyOption>(
        data.currency || "ZORA"
    );
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
                    } else {
                        setCreatorCoin(null);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch profile:", err);
                setError("Failed to load profile information");
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [address]);

    // Update wizard data when currency changes
    useEffect(() => {
        updateData({ currency: selectedCurrency });
    }, [selectedCurrency, updateData]);

    const handleCurrencySelect = (currency: CurrencyOption) => {
        setSelectedCurrency(currency);
    };

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
                    <CardTitle>Select Backing Currency</CardTitle>
                    <p className="text-sm text-muted-foreground">
                        Loading your profile information...
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
                <CardTitle>Select Backing Currency</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Choose which currency will back your content coin's liquidity pool
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-red-900 dark:text-red-100">
                                    {error}
                                </p>
                                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                    Defaulting to ZORA currency
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Creator Coin Option (if available) */}
                {creatorCoin && (
                    <button
                        onClick={() => handleCurrencySelect("CREATOR_COIN")}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedCurrency === "CREATOR_COIN"
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="font-semibold">Your Creator Coin</h3>
                                    <Badge variant="default" className="text-xs">
                                        Recommended
                                    </Badge>
                                    {selectedCurrency === "CREATOR_COIN" && (
                                        <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">
                                    Pair with your existing Creator Coin {profileHandle && `($${profileHandle})`}
                                </p>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-muted-foreground">Market Cap:</span>
                                        <p className="font-medium">{formatMarketCap(creatorCoin.marketCap)}</p>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">24h Change:</span>
                                        <p className={`font-medium ${parseFloat(creatorCoin.marketCapDelta24h) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {parseFloat(creatorCoin.marketCapDelta24h) >= 0 ? '+' : ''}
                                            {parseFloat(creatorCoin.marketCapDelta24h).toFixed(2)}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border">
                            <p className="text-xs text-muted-foreground">
                                ✓ Aligns rewards with your creator economy
                                <br />
                                ✓ Reduces slippage risk for your community
                                <br />
                                ✓ Strengthens your creator brand
                            </p>
                        </div>
                    </button>
                )}

                {/* ZORA Option */}
                <button
                    onClick={() => handleCurrencySelect("ZORA")}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedCurrency === "ZORA"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">ZORA Token</h3>
                                {!creatorCoin && (
                                    <Badge variant="secondary" className="text-xs">
                                        Default
                                    </Badge>
                                )}
                                {selectedCurrency === "ZORA" && (
                                    <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Pair with the ZORA protocol token
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            ✓ Widely available and liquid
                            <br />
                            ✓ No Creator Coin required
                            <br />
                            ✓ Standard option for most creators
                        </p>
                    </div>
                </button>

                {/* ETH Option */}
                <button
                    onClick={() => handleCurrencySelect("ETH")}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${selectedCurrency === "ETH"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">ETH (Ethereum)</h3>
                                {selectedCurrency === "ETH" && (
                                    <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                                Pair with native Ethereum
                            </p>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground">
                            ✓ Most liquid asset
                            <br />
                            ✓ Familiar to all traders
                            <br />
                            ✓ Direct ETH trading pairs
                        </p>
                    </div>
                </button>

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                                About Backing Currency
                            </p>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                Your content coin will be paired with the selected currency in a Uniswap V4 pool.
                                This determines what traders use to buy and sell your coin.
                            </p>
                            {!creatorCoin && (
                                <a
                                    href="https://support.zora.co/en/articles/6338433"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                                >
                                    Learn how to create a Creator Coin
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
