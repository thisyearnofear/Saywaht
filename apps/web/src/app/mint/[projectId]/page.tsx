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
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Mint Successful!</h2>
        <p className="text-muted-foreground">
          Your commentary "{mintedCoin.name}" ({mintedCoin.symbol}) is now a
          Zora Coin.
        </p>
        <div className="flex flex-col gap-4 mt-6">
          <Button asChild>
            <a
              href={`https://testnet.zora.co/`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Zora
            </a>
          </Button>
          <Button asChild>
            <a
              href={`https://warpcast.com/~/compose?text=Check%20out%20my%20new%20commentary!`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Share to Farcaster
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/profile/${address}`}>View My Collection</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Coin Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Awesome Coin"
          />
        </div>
        <div>
          <Label htmlFor="symbol">Coin Symbol</Label>
          <Input
            id="symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="MAC"
          />
        </div>
      </div>
      <div className="flex gap-4 mt-6">
        <Button asChild variant="outline">
          <Link href="/editor">Back to Editor</Link>
        </Button>
        <Button onClick={handleMint} disabled={!config || status === "pending"}>
          {status === "pending" ? "Minting..." : "Mint Commentary"}
        </Button>
      </div>
    </>
  );
}

export default function MintPage() {
  const { projectId } = useParams();

  return (
    <div>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h1 className="text-3xl font-bold mb-4">Review & Mint</h1>
            <div className="bg-muted aspect-video rounded-lg">
              <PreviewPanel />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-4">Coin Details</h2>
            <MintCoinFormComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
