import { FarcasterMobileEditorLayout } from "@/farcaster/components/farcaster-mobile-editor";
import { headers } from "next/headers";

/**
 * Farcaster Mini App Page
 * Entry point for Farcaster frame integration
 * Uses enhanced mobile editor layout with Farcaster-specific features
 *
 * ENHANCEMENT FIRST: Inherits metadata from layout.tsx (single source of truth)
 * CLEAN: No duplicate metadata - follows DRY principle
 */

export default function FarcasterPage() {
  // Check if this is a Farcaster request
  const headerList = headers();
  const userAgent = headerList.get("user-agent") || "";
  const isFarcasterRequest =
    userAgent.includes("Farcaster") ||
    headerList.get("referer")?.includes("farcaster") ||
    headerList.get("origin")?.includes("farcaster");

  return (
    <FarcasterMobileEditorLayout>
      {/* Main Farcaster Mini App content */}
    </FarcasterMobileEditorLayout>
  );
}

// Disable static generation for this page since it's dynamic
export const dynamic = "force-dynamic";
