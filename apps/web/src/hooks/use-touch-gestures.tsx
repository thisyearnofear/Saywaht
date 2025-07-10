"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "@/lib/hooks-provider";

export interface TouchGestureState {
  isActive: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  velocity: number;
  direction: "left" | "right" | "up" | "down" | null;
  scale: number;
  rotation: number;
}

export interface TouchGestureCallbacks {
  onSwipeLeft?: (state: TouchGestureState) => void;
  onSwipeRight?: (state: TouchGestureState) => void;
  onSwipeUp?: (state: TouchGestureState) => void;
  onSwipeDown?: (state: TouchGestureState) => void;
  onPinchStart?: (state: TouchGestureState) => void;
  onPinchMove?: (state: TouchGestureState) => void;
  onPinchEnd?: (state: TouchGestureState) => void;
  onTap?: (state: TouchGestureState) => void;
  onLongPress?: (state: TouchGestureState) => void;
  onPan?: (state: TouchGestureState) => void;
}

export interface TouchGestureOptions {
  threshold?: number;
  velocityThreshold?: number;
  longPressDelay?: number;
  preventDefault?: boolean;
  enablePinch?: boolean;
  enableSwipe?: boolean;
  enablePan?: boolean;
  enableLongPress?: boolean;
}

const DEFAULT_OPTIONS: TouchGestureOptions = {
  threshold: 10,
  velocityThreshold: 0.3,
  longPressDelay: 500,
  preventDefault: false,
  enablePinch: true,
  enableSwipe: true,
  enablePan: true,
  enableLongPress: true,
};

export function useTouchGestures(
  callbacks: TouchGestureCallbacks,
  options: TouchGestureOptions = {}
) {
  const opts = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const [gestureState, setGestureState] = useState<TouchGestureState>({
    isActive: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
    direction: null,
    scale: 1,
    rotation: 0,
  });

  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const initialDistance = useRef<number>(0);
  const initialScale = useRef<number>(1);
  const lastTouchTime = useRef<number>(0);
  const isTwoFingerGesture = useRef<boolean>(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const getDistance = useCallback((touches: TouchList) => {
    if (touches.length < 2) return 0;
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  }, []);

  const getCenter = useCallback((touches: TouchList) => {
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    const x = (touches[0].clientX + touches[1].clientX) / 2;
    const y = (touches[0].clientY + touches[1].clientY) / 2;
    return { x, y };
  }, []);

  const calculateVelocity = useCallback(
    (deltaX: number, deltaY: number, deltaTime: number) => {
      if (deltaTime === 0) return 0;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      return distance / deltaTime;
    },
    []
  );

  const getSwipeDirection = useCallback(
    (
      deltaX: number,
      deltaY: number
    ): "left" | "right" | "up" | "down" | null => {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? "right" : "left";
      } else {
        return deltaY > 0 ? "down" : "up";
      }
    },
    []
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (opts.preventDefault) {
        event.preventDefault();
      }

      const touches = event.touches;
      const center = getCenter(touches);
      const now = Date.now();

      touchStartTime.current = now;
      isTwoFingerGesture.current = touches.length === 2;

      if (touches.length === 2 && opts.enablePinch) {
        initialDistance.current = getDistance(touches);
        initialScale.current = gestureState.scale;
      }

      const newState: TouchGestureState = {
        isActive: true,
        startX: center.x,
        startY: center.y,
        currentX: center.x,
        currentY: center.y,
        deltaX: 0,
        deltaY: 0,
        velocity: 0,
        direction: null,
        scale: gestureState.scale,
        rotation: gestureState.rotation,
      };

      setGestureState(newState);

      // Start long press timer for single finger
      if (touches.length === 1 && opts.enableLongPress) {
        longPressTimer.current = setTimeout(() => {
          callbacks.onLongPress?.(newState);
        }, opts.longPressDelay);
      }
    },
    [
      opts,
      gestureState.scale,
      gestureState.rotation,
      getCenter,
      getDistance,
      callbacks,
    ]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (opts.preventDefault) {
        event.preventDefault();
      }

      const touches = event.touches;
      const center = getCenter(touches);
      const now = Date.now();
      const deltaTime = now - touchStartTime.current;

      clearLongPressTimer();

      const deltaX = center.x - gestureState.startX;
      const deltaY = center.y - gestureState.startY;
      const velocity = calculateVelocity(deltaX, deltaY, deltaTime);
      const direction = getSwipeDirection(deltaX, deltaY);

      let newScale = gestureState.scale;

      // Handle pinch gesture
      if (touches.length === 2 && opts.enablePinch) {
        const currentDistance = getDistance(touches);
        if (initialDistance.current > 0) {
          const scaleChange = currentDistance / initialDistance.current;
          newScale = initialScale.current * scaleChange;
        }
      }

      const newState: TouchGestureState = {
        ...gestureState,
        currentX: center.x,
        currentY: center.y,
        deltaX,
        deltaY,
        velocity,
        direction,
        scale: newScale,
      };

      setGestureState(newState);

      // Handle different gesture types
      if (touches.length === 2 && opts.enablePinch) {
        if (Math.abs(newScale - gestureState.scale) > 0.01) {
          callbacks.onPinchMove?.(newState);
        }
      } else if (touches.length === 1 && opts.enablePan) {
        callbacks.onPan?.(newState);
      }
    },
    [
      opts,
      gestureState,
      getCenter,
      getDistance,
      calculateVelocity,
      getSwipeDirection,
      clearLongPressTimer,
      callbacks,
    ]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (opts.preventDefault) {
        event.preventDefault();
      }

      const now = Date.now();
      const touchDuration = now - touchStartTime.current;

      clearLongPressTimer();

      const newState: TouchGestureState = {
        ...gestureState,
        isActive: false,
      };

      setGestureState(newState);

      // Handle different gesture completions
      if (isTwoFingerGesture.current && opts.enablePinch) {
        callbacks.onPinchEnd?.(newState);
      } else if (
        (opts.enableSwipe && Math.abs(gestureState.deltaX) > opts.threshold) ||
        Math.abs(gestureState.deltaY) > opts.threshold
      ) {
        // Handle swipe
        if (gestureState.velocity > opts.velocityThreshold) {
          switch (gestureState.direction) {
            case "left":
              callbacks.onSwipeLeft?.(newState);
              break;
            case "right":
              callbacks.onSwipeRight?.(newState);
              break;
            case "up":
              callbacks.onSwipeUp?.(newState);
              break;
            case "down":
              callbacks.onSwipeDown?.(newState);
              break;
          }
        }
      } else if (
        touchDuration < 200 &&
        Math.abs(gestureState.deltaX) < opts.threshold &&
        Math.abs(gestureState.deltaY) < opts.threshold
      ) {
        // Handle tap
        callbacks.onTap?.(newState);
      }

      // Reset for next gesture
      isTwoFingerGesture.current = false;
      initialDistance.current = 0;
      initialScale.current = 1;
    },
    [opts, gestureState, clearLongPressTimer, callbacks]
  );

  const gestureHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    gestureState,
    gestureHandlers,
  };
}

// Hook for pinch-to-zoom specifically
export function usePinchZoom(
  onZoomChange: (scale: number) => void,
  options: { minScale?: number; maxScale?: number } = {}
) {
  const { minScale = 0.5, maxScale = 3 } = options;
  const [scale, setScale] = useState(1);

  const { gestureHandlers } = useTouchGestures(
    {
      onPinchMove: (state) => {
        const clampedScale = Math.max(
          minScale,
          Math.min(maxScale, state.scale)
        );
        setScale(clampedScale);
        onZoomChange(clampedScale);
      },
    },
    {
      enablePinch: true,
      enableSwipe: false,
      enablePan: false,
      enableLongPress: false,
    }
  );

  return {
    scale,
    setScale,
    gestureHandlers,
  };
}

// Hook for swipe gestures specifically
export function useSwipeGestures(callbacks: {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}) {
  const { gestureHandlers } = useTouchGestures(
    {
      onSwipeLeft: callbacks.onSwipeLeft,
      onSwipeRight: callbacks.onSwipeRight,
      onSwipeUp: callbacks.onSwipeUp,
      onSwipeDown: callbacks.onSwipeDown,
    },
    {
      enablePinch: false,
      enableSwipe: true,
      enablePan: false,
      enableLongPress: false,
    }
  );

  return { gestureHandlers };
}
