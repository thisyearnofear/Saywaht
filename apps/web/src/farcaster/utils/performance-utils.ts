/**
 * Farcaster Mini App v2 performance utilities
 * PERFORMANT: Optimized for minimal bundle size and maximum performance
 * CLEAN: Focused only on Mini Apps v2 specification
 * DRY: Single source of truth for Farcaster context detection
 */

/**
 * Lightweight Farcaster Mini App context detection
 * PERFORMANT: Server-side detection avoids heavy client-side computation
 * MODULAR: Works with both legacy frames and Mini Apps v2
 */
export function isFarcasterContext(headers: Headers): boolean {
  const userAgent = headers.get('user-agent') || '';
  const referer = headers.get('referer') || '';
  const origin = headers.get('origin') || '';

  return (
    userAgent.includes('Farcaster') ||
    referer.includes('farcaster') ||
    origin.includes('farcaster') ||
    // Mini App specific indicators
    !!headers.get('x-farcaster-context') ||
    !!headers.get('x-miniapp-context')
  );
}

/**
 * Check if request is from a Farcaster Mini App
 * CLEAN: Specific detection for Mini Apps v2
 */
export function isFarcasterMiniApp(headers: Headers): boolean {
  return isFarcasterContext(headers) && (
    headers.get('user-agent')?.includes('MiniApp') ||
    !!headers.get('x-miniapp-context')
  );
}

/**
 * Get optimized app state for Mini App context
 * PERFORMANT: Pre-computed states for better performance
 * MODULAR: State management separated from UI concerns
 */
export function getOptimizedAppState(context: 'welcome' | 'editor' | 'mint' | 'complete' = 'welcome') {
  const stateConfig = {
    welcome: {
      title: 'Create Video Commentary',
      description: 'Transform your thoughts into viral content',
      primaryAction: 'Start Creating',
      secondaryAction: 'Browse Examples'
    },
    editor: {
      title: 'Video Editor',
      description: 'Add your voice to any video',
      primaryAction: 'Record Commentary',
      secondaryAction: 'Import Video'
    },
    mint: {
      title: 'Create Coin',
      description: 'Deploy your content as tradeable coin',
      primaryAction: 'Create Coin',
      secondaryAction: 'Preview'
    },
    complete: {
      title: 'Coin Created!',
      description: 'Your commentary coin is now live',
      primaryAction: 'Share Coin',
      secondaryAction: 'Create Another'
    }
  };

  return stateConfig[context];
}
