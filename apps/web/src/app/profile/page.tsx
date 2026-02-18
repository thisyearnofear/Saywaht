"use client";

import { useWalletAuth } from "@saywaht/auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfileRedirect() {
  const { user, isAuthenticated } = useWalletAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated && user?.address) {
      router.replace(`/profile/${user.address}`);
    } else {
      router.replace("/");
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-muted-foreground">Redirecting to profile...</div>
    </div>
  );
}
