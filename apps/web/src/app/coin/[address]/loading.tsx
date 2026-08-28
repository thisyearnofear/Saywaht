import { Loader2 } from "lucide-react";

export default function CoinLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading coin...</p>
        </div>
      </div>
    </div>
  );
}
