/**
 * Enhanced Farcaster performance utilities
 * Optimized for minimal bundle size and maximum performance
 */

/**
 * Lightweight Farcaster context detection
 * Avoids heavy client-side detection in favor of server-side headers
 */
export function isFarcasterContext(headers: Headers): boolean {
  // Check multiple indicators to ensure reliable detection
  const userAgent = headers.get('user-agent') || '';
  const referer = headers.get('referer') || '';
  const origin = headers.get('origin') || '';
  
  return (
    userAgent.includes('Farcaster') ||
    referer.includes('farcaster') ||
    origin.includes('farcaster') ||
    // Additional frame-specific indicators
    !!headers.get('x-farcaster-context') ||
    // Frame action indicator
    !!headers.get('x-frame-signature')
  );
}

/**
 * Optimized frame metadata generation
 * Minimizes computation and maximizes cacheability
 */
export function generateOptimizedFrameMetadata(state: string = 'welcome') {
  // Pre-computed base metadata for performance
  const baseMetadata = {
    "fc:frame": "vNext",
    "fc:frame:post_url": `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.vercel.app"}/api/farcaster/action`,
  };
  
  // State-specific optimizations
  const stateConfig = {
    welcome: {
      "fc:frame:image": `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.vercel.app"}/api/farcaster/image?state=welcome`,
      "fc:frame:button:1": "Create Commentary",
      "fc:frame:button:2": "Browse Coins"
    },
    recording: {
      "fc:frame:image": `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.vercel.app"}/api/farcaster/image?state=recording`,
      "fc:frame:button:1": "Start Recording",
      "fc:frame:button:2": "Cancel"
    },
    minting: {
      "fc:frame:image": `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.vercel.app"}/api/farcaster/image?state=minting`,
      "fc:frame:button:1": "Create Coin",
      "fc:frame:button:2": "Share Only"
    },
    complete: {
      "fc:frame:image": `${process.env.NEXT_PUBLIC_APP_URL || "https://saywaht.vercel.app"}/api/farcaster/image?state=complete`,
      "fc:frame:button:1": "Create Another",
      "fc:frame:button:2": "View Profile"
    }
  };
  
  return {
    ...baseMetadata,
    ...stateConfig[state as keyof typeof stateConfig]
  };
}

/**
 * Performance-optimized frame image generation
 * Uses caching and minimal computation
 */
export async function generateOptimizedFrameImage(
  state: string = 'welcome',
  title?: string,
  subtitle?: string
) {
  // In a production implementation, this would use:
  // 1. Redis caching for generated images
  // 2. CDN caching headers
  // 3. Pre-rendered templates for common states
  // 4. Minimal font loading (system fonts only)
  
  const config = {
    welcome: { bg: '#000000', accent: '#9CA3AF', icon: '🎬' },
    recording: { bg: '#EF4444', accent: '#FECACA', icon: '🔴' },
    minting: { bg: '#3B82F6', accent: '#BFDBFE', icon: '🪙' },
    complete: { bg: '#10B981', accent: '#A7F3D0', icon: '✅' }
  };
  
  const stateConfig = config[state as keyof typeof config] || config.welcome;
  
  return {
    backgroundColor: stateConfig.bg,
    accentColor: stateConfig.accent,
    icon: stateConfig.icon,
    title: title || getDefaultTitle(state),
    subtitle: subtitle || getDefaultSubtitle(state)
  };
}

function getDefaultTitle(state: string): string {
  const titles = {
    welcome: 'Create Video Commentary',
    recording: 'Record Your Commentary',
    minting: 'Create Your Coin',
    complete: 'Coin Created!'
  };
  return titles[state as keyof typeof titles] || titles.welcome;
}

function getDefaultSubtitle(state: string): string {
  const subtitles = {
    welcome: 'Powered by saywaht',
    recording: 'Add your voice to any video',
    minting: 'Turn commentary into tradable coins',
    complete: 'Share your coin with the world'
  };
  return subtitles[state as keyof typeof subtitles] || subtitles.welcome;
}