// Use hooks-provider instead of direct React imports
import { useState, useEffect } from "@/lib/hooks-provider";

const MOBILE_BREAKPOINT = 1024; // Increased to better detect actual mobile devices

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const checkIsMobile = () => {
      // Check screen size
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;

      // Check for touch capability
      const hasTouchScreen =
        "ontouchstart" in window || navigator.maxTouchPoints > 0;

      // Check user agent for mobile devices
      const mobileUserAgent =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      // Consider it mobile if it's a small screen AND (has touch OR mobile user agent)
      // This prevents large desktop screens from being detected as mobile
      const isMobileDevice =
        isSmallScreen && (hasTouchScreen || mobileUserAgent);

      setIsMobile(isMobileDevice);
    };

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    mql.addEventListener("change", checkIsMobile);
    checkIsMobile();

    return () => mql.removeEventListener("change", checkIsMobile);
  }, []);

  return !!isMobile;
}
