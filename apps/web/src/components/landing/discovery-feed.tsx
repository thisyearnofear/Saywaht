"use client";

import { useEffect, useState } from "react";
import { getLatestCommentaries } from "@/lib/zora";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { SimpleVideoPlayer } from "../ui/simple-video-player";

type Commentary = {
  id: string;
  name: string;
  symbol: string;
  videoUrl: string;
  creatorAddress: string;
};

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
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Latest Commentaries</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {commentaries.map((commentary) => (
          <Card key={commentary.id}>
            <CardHeader>
              <CardTitle>{commentary.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleVideoPlayer src={commentary.videoUrl} />
              <p className="text-sm text-muted-foreground mt-2">
                Created by: {commentary.creatorAddress}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
