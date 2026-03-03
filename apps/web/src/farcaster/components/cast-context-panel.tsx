"use client";

import { useEffect, useState, useCallback } from "react";
import { getFarcasterSdk } from "@/lib/farcaster-sdk";
import { Loader2, ExternalLink, MessageSquare } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { addHapticFeedback } from "@/lib/mobile-utils";
import { toast } from "sonner";

interface CastContextPanelProps {
  castHash: string;
  className?: string;
  onCastClick?: () => void;
}

interface CastData {
  hash: string;
  text: string;
  author: {
    username: string;
    pfp_url: string;
    display_name: string;
    fid: number;
  };
  timestamp: number;
  reactions: {
    likes: number;
    recasts: number;
  };
}

// Simple in-memory cache for cast data
const castCache = new Map<string, { data: CastData; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * CastContextPanel
 * Displays the context of the cast being reacted to.
 * Fetches real cast data with caching and error handling.
 */
export function CastContextPanel({
  castHash,
  className,
  onCastClick,
}: CastContextPanelProps) {
  const [loading, setLoading] = useState(true);
  const [cast, setCast] = useState<CastData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCast = useCallback(async () => {
    if (!castHash) return;

    setLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = castCache.get(castHash);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setCast(cached.data);
        setLoading(false);
        return;
      }

      // Use internal API proxy to avoid CORS issues
      const path = `/api/farcaster/cast?hash=${castHash}`;

      // Try to use SDK fetch if available, otherwise fall back to regular fetch
      const sdk = await getFarcasterSdk();
      const fetcher = sdk ? (sdk as any).fetch : null;
      
      let response: Response;
      if (typeof fetcher === "function") {
        response = await fetcher(path);
      } else {
        response = await fetch(path);
      }

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Cast not found");
        }
        throw new Error(`Failed to fetch cast: ${response.status}`);
      }

      const data = await response.json();
      const castData = data.result?.cast;

      if (!castData) {
        throw new Error("Invalid cast data received");
      }

      const parsedCast: CastData = {
        hash: castData.hash,
        text: castData.text,
        author: {
          username: castData.author.username,
          display_name: castData.author.displayName,
          pfp_url: castData.author.pfp.url,
          fid: castData.author.fid,
        },
        timestamp: new Date(castData.timestamp).getTime(),
        reactions: {
          likes: castData.reactions?.likes?.length || 0,
          recasts: castData.reactions?.recasts?.length || 0,
        },
      };

      // Cache the result
      castCache.set(castHash, {
        data: parsedCast,
        timestamp: Date.now(),
      });

      setCast(parsedCast);
    } catch (err) {
      console.error("Failed to fetch cast:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load cast";
      setError(errorMessage);
      
      // Show toast for persistent errors
      if (errorMessage !== "Cast not found") {
        toast.error("Could not load cast context", {
          description: "You can still create your reaction",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [castHash]);

  useEffect(() => {
    fetchCast();
  }, [fetchCast]);

  const handleOpenInFarcaster = () => {
    addHapticFeedback("light");
    if (cast?.hash) {
      const url = `https://warpcast.com/~/conversation/${cast.hash}`;
      window.open(url, "_blank");
      onCastClick?.();
    }
  };

  if (loading) {
    return (
      <div
        className={cn(
          "w-full p-4 border-b bg-muted/30 flex items-center justify-center",
          className
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">
          Loading context...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "w-full p-4 border-b bg-destructive/10 flex items-center gap-3",
          className
        )}
      >
        <MessageSquare className="h-4 w-4 text-destructive" />
        <div className="flex-1">
          <p className="text-xs font-medium text-destructive">
            {error === "Cast not found" ? "Cast not found" : "Could not load cast"}
          </p>
          <p className="text-[10px] text-destructive/70">
            {error === "Cast not found" 
              ? "This cast may have been deleted" 
              : "You can still create your reaction"}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-[10px] uppercase tracking-widest"
          onClick={fetchCast}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (!cast) return null;

  return (
    <div
      className={cn(
        "w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Image
            src={cast.author.pfp_url}
            alt={cast.author.username}
            width={40}
            height={40}
            className="rounded-full bg-muted"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">
                {cast.author.display_name}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                @{cast.author.username}
              </span>
            </div>
            <p className="text-sm mt-2 text-foreground/90 leading-relaxed">
              {cast.text}
            </p>
            
            {/* Reaction stats */}
            {(cast.reactions.likes > 0 || cast.reactions.recasts > 0) && (
              <div className="flex items-center gap-4 mt-3">
                {cast.reactions.likes > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    ❤️ {cast.reactions.likes}
                  </span>
                )}
                {cast.reactions.recasts > 0 && (
                  <span className="text-[10px] text-muted-foreground font-medium">
                    🔁 {cast.reactions.recasts}
                  </span>
                )}
              </div>
            )}

            {/* Action button */}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 h-8 text-[10px] uppercase tracking-widest gap-2"
              onClick={handleOpenInFarcaster}
            >
              <ExternalLink className="h-3 w-3" />
              Open in Farcaster
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
