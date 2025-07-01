"use client";

import { useEffect, useState } from "react";
import { getLatestCommentaries, Commentary } from "@/lib/zora";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SimpleVideoPlayer } from "../ui/simple-video-player";
import { Badge } from "../ui/badge";
import { Coins, TrendingUp } from "lucide-react";

export function DiscoveryFeed() {
  const [commentaries, setCommentaries] = useState<Commentary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCommentaries = async () => {
      try {
        const data = await getLatestCommentaries();
        setCommentaries(data);
      } catch (error) {
        console.error("Failed to fetch commentaries:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommentaries();
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Coins className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Latest Commentary Coins</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded mb-3"></div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Coins className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Latest Commentary Coins</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {commentaries.map((commentary) => (
          <Card key={commentary.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="truncate">{commentary.name}</CardTitle>
                <Badge variant="secondary">{commentary.symbol}</Badge>
              </div>
              {commentary.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {commentary.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              {commentary.videoUrl && (
                <SimpleVideoPlayer src={commentary.videoUrl} />
              )}
              
              <div className="flex flex-col gap-2 mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Creator:</span>
                  <span className="font-mono text-xs">
                    {commentary.creatorAddress.slice(0, 6)}...{commentary.creatorAddress.slice(-4)}
                  </span>
                </div>
                
                {commentary.marketCap && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Market Cap:</span>
                    <span className="font-semibold">{commentary.marketCap}</span>
                  </div>
                )}
                
                {commentary.volume24h && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      24h Volume:
                    </span>
                    <span className="font-semibold">{commentary.volume24h}</span>
                  </div>
                )}
                
                {commentary.createdAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="text-xs">
                      {new Date(commentary.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {commentaries.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Coins className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No commentaries found</h3>
          <p className="text-muted-foreground">
            Be the first to create a commentary coin!
          </p>
        </div>
      )}
    </div>
  );
}
