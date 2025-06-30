"use client";

import { Header } from "@/components/header";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PreviewPanel } from "@/components/editor/preview-panel";
import { useEffect, useState } from "react";
import { useAccount, useSimulateContract, useWriteContract } from "wagmi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createCoinCall, DeployCurrency } from "@zoralabs/coins-sdk";
import { toast } from "sonner";
import { baseSepolia } from "viem/chains";
import { motion } from "motion/react";
import {
  Coins,
  CheckCircle,
  ExternalLink,
  Share2,
  ArrowLeft,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function MintCoinFormComponent() {
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const { address } = useAccount();
  const [mintedCoin, setMintedCoin] = useState<{
    name: string;
    symbol: string;
  } | null>(null);

  const metadataURI =
    "ipfs://bafybeigoxzqzbnxsn35vq7lls3ljxdcwjafxvbvkivprsodzrptpiguysy";

  const { data: config } = useSimulateContract({
    ...createCoinCall({
      name,
      symbol,
      uri: metadataURI,
      payoutRecipient: address!,
      platformReferrer: "0x55A5705453Ee82c742274154136Fce8149597058",
      chainId: baseSepolia.id,
      currency: DeployCurrency.ETH,
    }),
    query: {
      enabled: !!address && !!name && !!symbol,
    },
  });

  const { writeContract, status, error } = useWriteContract();

  const handleMint = () => {
    if (!config) {
      toast.error("Could not prepare transaction. Please try again.");
      return;
    }
    writeContract(config.request);
  };

  useEffect(() => {
    if (status === "pending") {
      toast.loading("Transaction pending...");
    } else if (status === "success") {
      toast.success("Transaction successful!");
      setMintedCoin({ name, symbol });
    } else if (status === "error") {
      toast.error(error?.message || "Transaction failed.");
    }
  }, [status, error, name, symbol]);

  if (mintedCoin) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-6"
      >
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-2">Mint Successful! 🎉</h2>
          <p className="text-muted-foreground">
            Your commentary "{mintedCoin.name}" ({mintedCoin.symbol}) is now a
            Zora Coin.
          </p>
        </div>

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          <Button asChild className="w-full">
            <a
              href={`https://testnet.zora.co/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Zora
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <a
              href={`https://warpcast.com/~/compose?text=Check%20out%20my%20new%20commentary!`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share to Farcaster
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/profile/${address}`}>View My Collection</Link>
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm font-medium">
            Coin Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Commentary"
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Choose a memorable name for your coin
          </p>
        </div>
        <div>
          <Label htmlFor="symbol" className="text-sm font-medium">
            Coin Symbol
          </Label>
          <Input
            id="symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="MAC"
            maxLength={6}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            3-6 characters, will be converted to uppercase
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link href="/editor">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Link>
        </Button>
        <Button
          onClick={handleMint}
          disabled={!config || status === "pending" || !name || !symbol}
          className="flex-1"
        >
          {status === "pending" ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Minting...
            </>
          ) : (
            <>
              <Coins className="w-4 h-4 mr-2" />
              Mint Commentary
            </>
          )}
        </Button>
      </div>

      {/* Mint Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">What happens when you mint?</p>
              <p className="text-xs text-muted-foreground">
                Your video becomes a tradeable Zora Coin that others can collect
                and trade. You'll receive royalties from future sales.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function MintPage() {
  const { projectId } = useParams();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">
              <Coins className="w-3 h-3 mr-1" />
              Mint as NFT
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Review & Mint Your Commentary
            </h1>
            <p className="text-muted-foreground">
              Transform your video into a tradeable Zora Coin
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Preview Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview</CardTitle>
                  <CardDescription>
                    Review your video before minting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted aspect-video rounded-lg overflow-hidden">
                    <PreviewPanel />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Mint Form Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Coin Details</CardTitle>
                  <CardDescription>Set up your commentary coin</CardDescription>
                </CardHeader>
                <CardContent>
                  <MintCoinFormComponent />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
