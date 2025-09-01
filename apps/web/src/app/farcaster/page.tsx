import { FarcasterMobileEditorLayout } from "@/farcaster/components/farcaster-mobile-editor";
import { headers } from 'next/headers';

/**
 * Farcaster Mini App Page
 * Entry point for Farcaster frame integration
 * Uses enhanced mobile editor layout with Farcaster-specific features
 */

export default function FarcasterPage() {
  // Check if this is a Farcaster request
  const headerList = headers();
  const userAgent = headerList.get('user-agent') || '';
  const isFarcasterRequest = userAgent.includes('Farcaster') || 
                            headerList.get('referer')?.includes('farcaster') ||
                            headerList.get('origin')?.includes('farcaster');
  
  return (
    <FarcasterMobileEditorLayout>
      {/* Farcaster-specific content can be added here */}
      <div className="hidden">
        {/* Hidden div for frame metadata - this will be read by Farcaster clients */}
        <meta name="fc:frame:button:1" content="Record Reaction" />
        <meta name="fc:frame:button:2" content="View Templates" />
      </div>
    </FarcasterMobileEditorLayout>
  );
}

// Disable static generation for this page since it's dynamic
export const dynamic = "force-dynamic";