"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, Upload, Coins, CheckCircle, ArrowRight } from "lucide-react";
import { useWalletAuth } from "@opencut/auth";
import { groveStorage } from "@/lib/grove-storage";
import { zoraCoins } from "@/lib/zora-coins";
import { generateCoinMetadata } from "@/lib/metadata";
import { toast } from "sonner";

interface VideoToCoinFlowProps {
  isOpen: boolean;
  onClose: () => void;
  videoBlob?: Blob;
  videoName?: string;
  projectId?: string;
}

export function VideoToCoinFlow({ 
  isOpen, 
  onClose, 
  videoBlob, 
  videoName = "My Video",
  projectId 
}: VideoToCoinFlowProps) {
  const { user, isAuthenticated } = useWalletAuth();
  const [step, setStep] = useState<"details" | "uploading" | "creating" | "success">("details");
  const [coinName, setCoinName] = useState(videoName);
  const [coinSymbol, setCoinSymbol] = useState("");
  const [videoUri, setVideoUri] = useState("");
  const [metadataUri, setMetadataUri] = useState("");
  const [coinAddress, setCoinAddress] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Auto-generate symbol from name
  const handleNameChange = (name: string) => {
    setCoinName(name);
    const symbol = name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    setCoinSymbol(symbol);
  };

  const handleCreateCoin = async () => {
    if (!isAuthenticated || !user?.address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!coinName.trim() || !coinSymbol.trim()) {
      toast.error("Please enter coin name and symbol");
      return;
    }

    try {
      setError(null);
      setStep("uploading");

      // Step 1: Upload video to IPFS if we have a blob
      let uploadedVideoUri = videoUri;
      if (videoBlob) {
        toast.loading("Uploading video to IPFS...");
        
        // Create a File from the blob
        const videoFile = new File([videoBlob], `${coinName}.webm`, { type: "video/webm" });
        const uploadResult = await groveStorage.uploadFile(videoFile);
        uploadedVideoUri = uploadResult.uri;
        setVideoUri(uploadedVideoUri);
        
        toast.dismiss();
        toast.success("Video uploaded to IPFS!");
      }

      // Step 2: Generate and upload metadata
      toast.loading("Creating coin metadata...");
      
      const metadata = generateCoinMetadata({
        name: coinName,
        symbol: coinSymbol,
        description: `A video coin created from "${coinName}" on SayWhat`,
        videoUri: uploadedVideoUri,
        creatorAddress: user.address,
        projectId: projectId,
      });

      const metadataResult = await groveStorage.uploadMetadata(metadata);
      setMetadataUri(metadataResult.uri);
      
      toast.dismiss();
      setStep("creating");

      // Step 3: Prepare coin creation
      toast.loading("Preparing coin creation...");
      
      const coin = await zoraCoins.createVideoCoin({
        name: coinName,
        symbol: coinSymbol,
        videoUri: uploadedVideoUri,
        metadataUri: metadataResult.uri,
        creatorAddress: user.address,
      });

      setCoinAddress(coin.address);
      toast.dismiss();
      setStep("success");
      
      toast.success("Coin created successfully!");
    } catch (err) {
      console.error("Failed to create coin:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to create coin";
      setError(errorMessage);
      toast.error(errorMessage);
      setStep("details");
    }
  };

  const handleGoToTrading = () => {
    onClose();
    window.location.href = "/trade";
  };

  const handleReset = () => {
    setStep("details");
    setError(null);
    setCoinName(videoName);
    setCoinSymbol("");
    setVideoUri("");
    setMetadataUri("");
    setCoinAddress("");
  };

  if (!isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Wallet Required</DialogTitle>
            <DialogDescription>
              You need to connect your wallet to create video coins.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => window.location.href = "/"}>
            Connect Wallet
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Video Coin</DialogTitle>
          <DialogDescription>
            Turn your video into a tradeable creator coin on Zora Protocol
          </DialogDescription>
        </DialogHeader>

        {step === "details" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="coinName">Coin Name</Label>
              <Input
                id="coinName"
                value={coinName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Amazing Video"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="coinSymbol">Symbol</Label>
              <Input
                id="coinSymbol"
                value={coinSymbol}
                onChange={(e) => setCoinSymbol(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="SYMBOL"
                maxLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateCoin} 
                className="flex-1"
                disabled={!coinName.trim() || !coinSymbol.trim()}
              >
                <Coins className="h-4 w-4 mr-2" />
                Create Coin
              </Button>
            </div>
          </div>
        )}

        {step === "uploading" && (
          <div className="text-center py-6">
            <Upload className="h-12 w-12 mx-auto mb-4 animate-pulse text-primary" />
            <h3 className="text-lg font-semibold mb-2">Uploading to IPFS</h3>
            <p className="text-muted-foreground">
              Storing your video on the decentralized web...
            </p>
          </div>
        )}

        {step === "creating" && (
          <div className="text-center py-6">
            <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
            <h3 className="text-lg font-semibold mb-2">Creating Coin</h3>
            <p className="text-muted-foreground">
              Preparing your video coin for deployment...
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500" />
            <div>
              <h3 className="text-lg font-semibold mb-2">Coin Created!</h3>
              <p className="text-muted-foreground">
                Your video coin "{coinName}" is ready for trading
              </p>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg text-sm space-y-1">
              <div><strong>Name:</strong> {coinName}</div>
              <div><strong>Symbol:</strong> ${coinSymbol}</div>
              <div><strong>Video:</strong> Stored on IPFS</div>
              <div><strong>Metadata:</strong> Stored on IPFS</div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} className="flex-1">
                Create Another
              </Button>
              <Button onClick={handleGoToTrading} className="flex-1">
                Start Trading
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
