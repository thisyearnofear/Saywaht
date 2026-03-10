import { useEffect, useState, useRef } from "react";

/**
 * Lazy loading for video elements
 * Only loads videos when they're about to be visible
 */
export function useLazyVideoLoading(
  clipStartTime: number,
  clipEndTime: number,
  currentTime: number,
  preloadWindow: number = 2 // seconds before clip starts
) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const hasLoadedRef = useRef(false);
  const clipIdentityRef = useRef(`${clipStartTime}-${clipEndTime}`);

  // Reset only when clip identity actually changes (not on every render)
  const currentIdentity = `${clipStartTime}-${clipEndTime}`;
  if (clipIdentityRef.current !== currentIdentity) {
    clipIdentityRef.current = currentIdentity;
    hasLoadedRef.current = false;
  }

  useEffect(() => {
    // Once loaded, stay loaded (don't unload during playback)
    if (hasLoadedRef.current) {
      return;
    }

    // Check if we're within the preload window or currently in the clip
    const timeUntilClip = clipStartTime - currentTime;
    const isCurrentlyInClip = currentTime >= clipStartTime && currentTime < clipEndTime;
    const isInPreloadWindow = timeUntilClip <= preloadWindow && timeUntilClip > 0;
    
    if (isCurrentlyInClip || isInPreloadWindow) {
      setShouldLoad(true);
      hasLoadedRef.current = true;
    }
  }, [clipStartTime, clipEndTime, currentTime, preloadWindow]);

  return shouldLoad;
}
