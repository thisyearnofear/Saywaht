import confetti from 'canvas-confetti';

/**
 * Trigger a celebration confetti animation
 */
export function triggerCelebration() {
  // First burst from the left
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { x: 0.2, y: 0.6 },
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
  });

  // Second burst from the right
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.8, y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
    });
  }, 250);

  // Third burst from the center
  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 120,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7']
    });
  }, 500);
}

/**
 * Trigger a coin-themed confetti animation
 */
export function triggerCoinCelebration() {
  // Create custom coin-like shapes
  const coinShape = confetti.shapeFromText({ text: '🪙', scalar: 2 });
  const starShape = confetti.shapeFromText({ text: '⭐', scalar: 1.5 });
  const rocketShape = confetti.shapeFromText({ text: '🚀', scalar: 1.5 });

  // Main celebration burst
  confetti({
    particleCount: 50,
    spread: 100,
    origin: { x: 0.5, y: 0.4 },
    shapes: [coinShape, starShape, rocketShape],
    scalar: 1.2,
    gravity: 0.8,
    drift: 0.1
  });

  // Side bursts with traditional confetti
  setTimeout(() => {
    confetti({
      particleCount: 75,
      spread: 60,
      origin: { x: 0.25, y: 0.7 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF']
    });

    confetti({
      particleCount: 75,
      spread: 60,
      origin: { x: 0.75, y: 0.7 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF']
    });
  }, 300);
}

/**
 * Trigger a subtle success animation
 */
export function triggerSuccessConfetti() {
  confetti({
    particleCount: 50,
    spread: 45,
    origin: { x: 0.5, y: 0.8 },
    colors: ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0'],
    gravity: 0.6,
    scalar: 0.8
  });
}
