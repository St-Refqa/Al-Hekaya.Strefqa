import confetti from 'canvas-confetti';
import { playSuccessSound } from './audio';

export const triggerSuccessConfetti = () => {
  // Play the sound
  playSuccessSound();

  // Trigger default confetti
  const duration = 3000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#EF4444', '#FCD34D', '#3B82F6']
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#EF4444', '#FCD34D', '#3B82F6']
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };
  frame();
};

export const triggerSimpleConfetti = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
};
