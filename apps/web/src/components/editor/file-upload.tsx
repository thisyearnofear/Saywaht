"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { badgeVariants } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getFilCDNService,
  isFilCDNConfigured,
  UploadResult,
} from "@/lib/filcdn";
import { useDropzone } from "react-dropzone";
import { useState, useCallback, useEffect } from "react";
import { useAccount } from "wagmi";
import { Switch } from "@/components/ui/switch";
import { recordCustomMetric } from "@/lib/performance-monitor";
import { UploadProgressRing } from "./upload-progress-ring";

interface FileUploadProps {
  onUploadComplete?: (result: UploadResult) => void;
  acceptedTypes?: Record<string, string[]>;
  maxSize?: number;
}

export function FileUpload({
  onUploadComplete,
  acceptedTypes = {
    "video/*": [".mp4", ".webm", ".mov", ".avi"],
    "audio/*": [".mp3", ".wav", ".m4a", ".ogg"],
  },
  maxSize = 254 * 1024 * 1024, // 254MB FilCDN limit
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useWalletUpload, setUseWalletUpload] = useState<boolean>(false);
  const { isConnected } = useAccount();

  const [status, setStatus] = useState<{
    configured: boolean;
    allowanceSufficient: boolean;
    walletAddress?: string;
  } | null>(null);
  const [clientPreflight, setClientPreflight] = useState<
    "unknown" | "pass" | "fail"
  >("unknown");

  // Check FilCDN status on mount
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const s = await isFilCDNConfigured();
      if (isMounted) setStatus(s);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Client-side allowance preflight when wallet connects
  useEffect(() => {
    let active = true;
    (async () => {
      if (isConnected) {
        try {
          const { checkClientPreflight } = await import("@/lib/filcdn");
          const res = await checkClientPreflight();
          if (active) setClientPreflight(res.allow ? "pass" : "fail");
        } catch {
          if (active) setClientPreflight("fail");
        }
      } else {
        if (active) setClientPreflight("unknown");
      }
    })();
    return () => {
      active = false;
    };
  }, [isConnected]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!status?.configured) {
        setError("FilCDN not configured. Please set up your Filecoin wallet.");
        return;
      }

      try {
        setIsUploading(true);
        setError(null);
        setUploadProgress(0);

        setUploadProgress(20);
        let result: UploadResult;
        if (useWalletUpload && isConnected) {
          const { uploadViaWallet } = await import("@/lib/filcdn");
          result = await uploadViaWallet(file);
        } else {
          const filcdnService = getFilCDNService();
          result = await filcdnService.uploadFile(file);
        }

        setUploadProgress(100);
        setUploadResult(result);

        toast.success(`✅ File uploaded to FilCDN successfully!`);
        recordCustomMetric("storage-upload", 1, "count", {
          provider: "filcdn",
          method: useWalletUpload && isConnected ? "wallet" : "server",
        });
        onUploadComplete?.(result);
      } catch (error: any) {
        console.error("Upload failed:", error);
        setError(error.message || "Upload failed");
        toast.error(`❌ Upload failed: ${error.message}`);
      } finally {
        setIsUploading(false);
      }
    },
    [onUploadComplete, status, isConnected, useWalletUpload]
  );

  // Simplified dropzone implementation
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadFile(acceptedFiles[0]);
      }
    },
    accept: acceptedTypes,
    maxSize,
    multiple: false,
    disabled: isUploading,
  } as any);

  if (!status?.configured && !isConnected) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-4">⚠️</span>
          <h3 className="text-lg font-semibold mb-2">FilCDN Not Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            To upload files to FilCDN, you need to configure your Filecoin
            Calibration testnet wallet.
          </p>
          <div className="space-y-2 text-xs text-left">
            <p>1. Set up Filecoin Calibration testnet wallet</p>
            <p>2. Get tFIL from faucet</p>
            <p>3. Get USDFC tokens</p>
            <p>4. Set environment variables</p>
          </div>
          <Button asChild className="mt-4" variant="outline">
            <a
              href={
                process.env.NEXT_PUBLIC_FILCDN_WEB_APP_URL ||
                "https://filcdn.com"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="mr-2">☁️</span>
              FilCDN Setup Guide
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status && !status.allowanceSufficient && !isConnected) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center p-6 text-center">
          <span className="text-2xl mb-4">ℹ️</span>
          <h3 className="text-lg font-semibold mb-2">
            Increase FilCDN Allowance
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Your wallet does not have sufficient allowance set for FilCDN
            uploads.
          </p>
          <Button asChild className="mt-2" variant="outline">
            <a
              href={
                process.env.NEXT_PUBLIC_FILCDN_WEB_APP_URL ||
                "https://filcdn.com"
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="mr-2">⚡</span>
              Open FilCDN Web App
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (uploadResult) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            <CardTitle className="text-lg">Upload Successful</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm">📄</span>
            <span className="font-medium">{uploadResult.filename}</span>
            <div className={cn(badgeVariants({ variant: "secondary" }))}>
              {(uploadResult.size / 1024 / 1024).toFixed(1)}MB
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-blue-500">⚡</span>
              <span className="text-muted-foreground">FilCDN URL:</span>
            </div>
            <div className="bg-muted p-2 rounded text-xs font-mono break-all">
              {uploadResult.filcdnUrl}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-purple-500">☁️</span>
              <span className="text-muted-foreground">CID:</span>
            </div>
            <div className="bg-muted p-2 rounded text-xs font-mono break-all">
              {uploadResult.cid}
            </div>
          </div>

          <Button
            onClick={() => {
              setUploadResult(null);
              setUploadProgress(0);
            }}
            variant="outline"
            className="w-full mt-4"
          >
            Upload Another File
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardContent className="p-6">
        {/* Readiness checklist */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            ></span>
            <span>Wallet</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                status?.configured ? "bg-green-500" : "bg-red-500"
              )}
            ></span>
            <span>Server Config</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "w-2 h-2 rounded-full",
                clientPreflight === "pass"
                  ? "bg-green-500"
                  : clientPreflight === "fail"
                  ? "bg-red-500"
                  : "bg-gray-400"
              )}
            ></span>
            <span>Client Allowance</span>
          </div>
        </div>
        {/* Advanced: Wallet-based upload toggle */}
        {isConnected && (
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs text-muted-foreground">
              Advanced: Use connected wallet for FilCDN upload
            </div>
            <Switch
              checked={useWalletUpload}
              onCheckedChange={(v: any) => setUseWalletUpload(!!v)}
              aria-label="Use wallet upload"
            />
          </div>
        )}
        {isUploading ? (
          <div className="py-8">
            <UploadProgressRing progress={uploadProgress} />
            <p className="text-xs text-muted-foreground text-center mt-4">
              Your video is being stored permanently on Filecoin...
            </p>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`cursor-pointer text-center p-8 rounded-lg transition-colors ${
              isDragActive
                ? "bg-primary/10 border-primary"
                : "hover:bg-muted/50"
            }`}
          >
            {/* Custom handling for input props to avoid TypeScript errors */}
            <input
              type="file"
              className="hidden"
              onChange={() => {}}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="h-12 w-12 mx-auto text-muted-foreground mb-4 inline-block">
              📤
            </span>

            {isDragActive ? (
              <p className="text-lg font-medium">Drop your file here!</p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium">Upload to FilCDN</p>
                <p className="text-sm text-muted-foreground">
                  Drag & drop or click to select video/audio files
                </p>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div
                    className={cn(
                      badgeVariants({ variant: "outline" }),
                      "text-xs"
                    )}
                  >
                    <span className="mr-1">⚡</span>
                    Low Latency CDN
                  </div>
                  <div
                    className={cn(
                      badgeVariants({ variant: "outline" }),
                      "text-xs"
                    )}
                  >
                    <span className="mr-1">☁️</span>
                    Filecoin PDP
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Max size: 254MB • Supports: MP4, WebM, MOV, MP3, WAV
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-600">
              <span className="text-sm">⚠️</span>
              <span className="text-sm font-medium">Upload Failed</span>
            </div>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
