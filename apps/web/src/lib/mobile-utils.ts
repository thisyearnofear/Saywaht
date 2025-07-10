/**
 * Mobile utility functions for better touch interactions
 */

/**
 * Adds haptic feedback on supported mobile devices
 */
export function addHapticFeedback(intensity: 'light' | 'medium' | 'heavy' = 'light') {
  if (typeof window === 'undefined') return;
  
  if ('vibrate' in navigator) {
    const duration = intensity === 'light' ? 10 : intensity === 'medium' ? 20 : 50;
    navigator.vibrate(duration);
  }
}

/**
 * Checks if the current device is likely a touch device
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore
    navigator.msMaxTouchPoints > 0
  );
}

/**
 * Prevents double-tap zoom on mobile while preserving other gestures
 */
export function preventDoubleTabZoom(element: HTMLElement) {
  let lastTouchEnd = 0;
  
  element.addEventListener('touchend', function (event) {
    const now = new Date().getTime();
    if (now - lastTouchEnd <= 300) {
      event.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

/**
 * Enhanced click handler that works better on mobile
 */
export function createMobileClickHandler(
  handler: (event: MouseEvent | TouchEvent) => void,
  options: {
    hapticFeedback?: boolean;
    preventDoubleClick?: boolean;
  } = {}
) {
  let lastClickTime = 0;
  
  return (event: MouseEvent | TouchEvent) => {
    const now = Date.now();
    
    // Prevent double clicks if requested
    if (options.preventDoubleClick && now - lastClickTime < 300) {
      return;
    }
    
    // Add haptic feedback
    if (options.hapticFeedback && isTouchDevice()) {
      addHapticFeedback('light');
    }
    
    lastClickTime = now;
    handler(event);
  };
}

/**
 * Improves button responsiveness on mobile
 */
export function enhanceButtonForMobile(button: HTMLButtonElement) {
  // Prevent iOS button styling
  button.style.webkitAppearance = 'none';
  button.style.touchAction = 'manipulation';
  
  // Add visual feedback
  button.addEventListener('touchstart', () => {
    button.style.transform = 'scale(0.95)';
    button.style.transition = 'transform 0.1s ease';
  });
  
  button.addEventListener('touchend', () => {
    button.style.transform = 'scale(1)';
  });
  
  button.addEventListener('touchcancel', () => {
    button.style.transform = 'scale(1)';
  });
}