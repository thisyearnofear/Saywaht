"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface CastContextPanelProps {
  castHash: string;
  className?: string;
}

interface CastData {
  text: string;
  author: {
    username: string;
    pfp_url: string;
    display_name: string;
  };
}

/**
 * CastContextPanel
 * Displays the context of the cast being reacted to.
 * Currently uses a mock/placeholder, but designed to fetch real data.
 */
export function CastContextPanel({
  castHash,
  className,
}: CastContextPanelProps) {
  const [loading, setLoading] = useState(true);
  const [cast, setCast] = useState<CastData | null>(null);

  useEffect(() => {
    const fetchCast = async () => {
      setLoading(true);
      try {
        // Use internal API proxy to avoid CORS issues
        let response: Response;
        const path = `/api/farcaster/cast?hash=${castHash}`;
        const fetcher = (sdk as any).fetch;
        if (typeof fetcher === "function") {
          response = await fetcher(path);
        } else {
          response = await fetch(path);
        }

        if (!response.ok) {
          throw new Error("Failed to fetch cast");
        }

        const data = await response.json();
        const castData = data.result.cast;

        setCast({
          text: castData.text,
          author: {
            username: castData.author.username,
            display_name: castData.author.displayName,
            pfp_url: castData.author.pfp.url,
          },
        });
      } catch (error) {
        console.error("Failed to fetch cast:", error);
        // Fallback to a generic message if fetch fails
        setCast({
          text: "Replying to a cast...",
          author: {
            username: "unknown",
            display_name: "Unknown User",
            pfp_url: "https://github.com/shadcn.png",
          },
        });
      } finally {
        setLoading(false);
      }
    };

    if (castHash) {
      fetchCast();
    }
  }, [castHash]);

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

  if (!cast) return null;

  return (
    <div
      className={cn(
        "w-full p-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Image
          src={cast.author.pfp_url}
          alt={cast.author.username}
          width={32}
          height={32}
          className="rounded-full bg-muted"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">
              {cast.author.display_name}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              @{cast.author.username}
            </span>
          </div>
          <p className="text-sm mt-1 line-clamp-2 text-foreground/90">
            {cast.text}
          </p>
        </div>
      </div>
    </div>
  );
}
