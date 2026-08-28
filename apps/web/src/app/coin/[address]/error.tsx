"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Coin page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-background">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-bold text-foreground">Couldn&apos;t load this coin</h2>
        <p className="text-muted-foreground">
          {error.message || "An unexpected error occurred. Please try again."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground">Error digest: {error.digest}</p>
        )}
        <div className="flex gap-4 justify-center pt-4">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button asChild variant="outline">
            <Link href="/trade">Browse coins</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
