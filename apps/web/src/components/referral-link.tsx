"use client";

import { useState, MouseEvent } from "@/lib/hooks-provider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Copy, Share2 } from "@/lib/icons-provider";
import { useWalletAuth } from "@opencut/auth";
import { buildReferralLink } from "@/lib/divvi-referral";
import { toast } from "sonner";

export function ReferralLink() {
  const { user, isAuthenticated } = useWalletAuth();
  const [copied, setCopied] = useState(false);

  if (!isAuthenticated || !user?.address) {
    return null;
  }

  const referralLink = buildReferralLink(user.address);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join SayWhat",
          text: "Create and trade video coins on SayWhat!",
          url: referralLink,
        });
      } catch (error) {
        // User cancelled or share failed
        console.log("Share cancelled or failed");
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Share your referral link and earn rewards when friends create or trade
        coins!
      </p>
      <div className="flex gap-2">
        <Input
          value={referralLink}
          readOnly
          className="font-mono text-xs"
          onClick={(e: MouseEvent<HTMLInputElement>) =>
            e.currentTarget.select()
          }
        />
        <Button
          size="icon"
          variant="outline"
          onClick={handleCopy}
          title="Copy referral link"
        >
          <Copy className={`h-4 w-4 ${copied ? "text-green-500" : ""}`} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={handleShare}
          title="Share referral link"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        You&apos;ll earn rewards when users sign up with your link and make
        their first transaction.
      </p>
    </div>
  );
}
