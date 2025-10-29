/**
 * Farcaster Mini App v2 utilities
 * ENHANCEMENT FIRST: Consolidates Mini App functionality
 * DRY: Single source of truth for Farcaster integration
 * CLEAN: Focused on Mini Apps v2 specification only
 */

export interface MiniAppEmbed {
  version: "1";
  imageUrl: string;
  button: {
    title: string;
    action: {
      type: "launch_frame";
      name: string;
      url: string;
      splashImageUrl?: string;
      splashBackgroundColor?: string;
    };
  };
}

/**
 * Generate Mini App embed metadata (v2 specification)
 * PERFORMANT: Pre-computed configuration for optimal performance
 */
export function generateMiniAppEmbed(overrides?: Partial<MiniAppEmbed>): MiniAppEmbed {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saywaht.netlify.app';

  const defaultEmbed: MiniAppEmbed = {
    version: "1",
    imageUrl: `${baseUrl}/opengraph-image.jpg`,
    button: {
      title: "🎬 Open Saywaht",
      action: {
        type: "launch_frame",
        name: "Saywaht",
        url: baseUrl,
        splashImageUrl: `${baseUrl}/images/android-chrome-512x512.png`,
        splashBackgroundColor: "#000000"
      }
    }
  };

  return {
    ...defaultEmbed,
    ...overrides,
    button: {
      ...defaultEmbed.button,
      ...overrides?.button,
      action: {
        ...defaultEmbed.button.action,
        ...overrides?.button?.action
      }
    }
  };
}

/**
 * Get Mini App manifest URL
 * MODULAR: Points to well-known manifest location
 */
export function getMiniAppManifestUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saywaht.netlify.app';
  return `${baseUrl}/.well-known/farcaster.json`;
}
