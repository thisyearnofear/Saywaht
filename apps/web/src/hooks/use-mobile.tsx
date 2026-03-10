// Use hooks-provider instead of direct React imports
import { useState, useEffect } from "react";

// Use 768px to match Tailwind's md: breakpoint
const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    // ENHANCEMENT: Prevent memory leaks with proper cleanup
    let mounted = true;
    
    const checkIsMobile = () => {
      // CLEAN: Early return if component unmounted
      if (!mounted) return;
      
      // Check screen size
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;

      // Check user agent for mobile devices
      const mobileUserAgent =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      // Consider it mobile if it's a small screen OR has a mobile user agent
      // Note: We don't use touch detection to avoid misclassifying touch laptops as mobile
      const isMobileDevice = isSmallScreen || mobileUserAgent;

      if (mounted) {
        setIsMobile(isMobileDevice);
      }
    };

    // Check immediately
    checkIsMobile();

    // Listen for changes
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    if (mql.addEventListener) {
      mql.addEventListener("change", checkIsMobile);
    } else {
      // Fallback for older browsers
      mql.addListener(checkIsMobile);
    }

    // ENHANCEMENT: Proper cleanup to prevent memory leaks
    return () => {
      mounted = false;
      if (mql.removeEventListener) {
        mql.removeEventListener("change", checkIsMobile);
      } else {
        mql.removeListener(checkIsMobile);
      }
    };
  }, []);

  return isMobile;
}

/**
 * Hook to determine if the component has mounted.
 * Useful for preventing hydration mismatches.
 */
export const useMounted = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};
