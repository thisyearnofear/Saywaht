import { FarcasterMobileEditorLayout } from "@/farcaster/components/farcaster-mobile-editor";

/**
 * Farcaster Mini App Page
 * Entry point for Farcaster frame integration
 * Uses enhanced mobile editor layout with Farcaster-specific features
 *
 * ENHANCEMENT FIRST: Inherits metadata from layout.tsx (single source of truth)
 * CLEAN: No duplicate metadata - follows DRY principle
 */

export default function FarcasterPage() {
  return (
    <FarcasterMobileEditorLayout />
  );
}

// Disable static generation for this page since it's dynamic
export const dynamic = "force-dynamic";
