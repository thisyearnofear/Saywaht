/**
 * Frame Rate Controller for smooth video export
 * Ensures consistent frame timing and handles performance variations
 */
export class FrameRateController {
  private frameRate: number;
  private frameInterval: number;
  private startTime: number = 0;
  private frameCount: number = 0;
  private droppedFrames: number = 0;
  private lastFrameTime: number = 0;
  private performanceBuffer: number[] = [];
  private readonly bufferSize = 30; // Track last 30 frames

  constructor(frameRate: number) {
    this.frameRate = frameRate;
    this.frameInterval = 1000 / frameRate;
  }

  /**
   * Start the frame rate controller
   */
  start(): void {
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.frameCount = 0;
    this.droppedFrames = 0;
    this.performanceBuffer = [];
  }

  /**
   * Calculate timing for the next frame
   * Returns: { shouldRender: boolean, delay: number, framesToSkip: number }
   * 
   * ENHANCEMENT: Smarter frame dropping strategy
   * - Don't drop frames unless really behind
   * - Prefer waiting over dropping
   * - Only drop if performance is consistently poor
   */
  getNextFrameTiming(): {
    shouldRender: boolean;
    delay: number;
    framesToSkip: number;
    currentFrame: number;
  } {
    const now = performance.now();
    const elapsed = now - this.startTime;
    const expectedFrame = Math.floor(elapsed / this.frameInterval);
    const framesToSkip = Math.max(0, expectedFrame - this.frameCount);
    
    // Calculate when the next frame should be rendered
    const nextFrameTime = this.startTime + ((this.frameCount + 1) * this.frameInterval);
    const delay = Math.max(0, nextFrameTime - now);
    
    // Track performance
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.performanceBuffer.push(frameTime);
      if (this.performanceBuffer.length > this.bufferSize) {
        this.performanceBuffer.shift();
      }
    }
    
    // ENHANCEMENT: Intelligent frame dropping strategy
    // Only drop frames if:
    // 1. We're significantly behind (more than 2 frames)
    // 2. AND performance is consistently poor (>2x slower than target)
    const averageFrameTime = this.getAverageFrameTime();
    const isConsistentlyLate = averageFrameTime > this.frameInterval * 2;
    const shouldDropFrames = framesToSkip > 2 && isConsistentlyLate;
    
    if (shouldDropFrames) {
      // Only drop half the frames to maintain quality
      const framesToActuallyDrop = Math.floor(framesToSkip / 2);
      this.droppedFrames += framesToActuallyDrop;
      this.frameCount += framesToActuallyDrop;
      
      console.warn(`⏩ Performance alert: Skipping ${framesToActuallyDrop}/${framesToSkip} frames (avg frame time: ${averageFrameTime.toFixed(1)}ms)`);
    }
    
    return {
      shouldRender: true,
      delay,
      framesToSkip: shouldDropFrames ? Math.floor(framesToSkip / 2) : 0,
      currentFrame: this.frameCount
    };
  }

  /**
   * Mark frame as completed
   */
  frameCompleted(): void {
    this.lastFrameTime = performance.now();
    this.frameCount++;
  }

  /**
   * Get average frame time from performance buffer
   */
  private getAverageFrameTime(): number {
    if (this.performanceBuffer.length === 0) return this.frameInterval;
    const sum = this.performanceBuffer.reduce((a, b) => a + b, 0);
    return sum / this.performanceBuffer.length;
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalFrames: number;
    droppedFrames: number;
    averageFrameTime: number;
    targetFrameTime: number;
    efficiency: number;
  } {
    const averageFrameTime = this.getAverageFrameTime();
    const efficiency = Math.min(100, (this.frameInterval / averageFrameTime) * 100);
    
    return {
      totalFrames: this.frameCount,
      droppedFrames: this.droppedFrames,
      averageFrameTime,
      targetFrameTime: this.frameInterval,
      efficiency
    };
  }

  /**
   * Calculate optimal delay using requestAnimationFrame timing
   */
  getOptimalDelay(targetDelay: number): {
    useRAF: boolean;
    timeoutDelay: number;
  } {
    // If delay is less than one display frame (16.67ms at 60Hz)
    // use requestAnimationFrame for better timing
    if (targetDelay < 16) {
      return { useRAF: true, timeoutDelay: 0 };
    }
    
    // Otherwise use setTimeout but account for RAF timing
    return { useRAF: false, timeoutDelay: targetDelay - 16 };
  }
}

/**
 * Helper function to schedule next frame with optimal timing
 */
export function scheduleNextFrame(
  callback: () => void,
  delay: number
): void {
  if (delay < 16) {
    // Use requestAnimationFrame for short delays
    requestAnimationFrame(callback);
  } else {
    // Use setTimeout with RAF for precise timing
    setTimeout(() => requestAnimationFrame(callback), delay - 16);
  }
}