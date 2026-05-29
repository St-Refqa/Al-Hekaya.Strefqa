export const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  vol: number = 0.1
) {
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  const oscillator = audioContext.createOscillator();
  const originGain = audioContext.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  originGain.gain.setValueAtTime(0.00001, audioContext.currentTime);
  originGain.gain.exponentialRampToValueAtTime(vol, audioContext.currentTime + 0.02);
  originGain.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + duration);

  oscillator.connect(originGain);
  originGain.connect(audioContext.destination);

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
}

export const playClickSound = () => {
  // A short subtle pop
  playTone(600, 'sine', 0.05, 0.1);
  setTimeout(() => playTone(800, 'sine', 0.05, 0.05), 20);
};

export const playHoverSound = () => {
  // Very soft click
  playTone(400, 'sine', 0.03, 0.02);
};

export const playSuccessSound = () => {
  // Happy chime
  playTone(523.25, 'sine', 0.1, 0.1); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.1, 0.1), 100); // E5
  setTimeout(() => playTone(783.99, 'sine', 0.2, 0.1), 200); // G5
  setTimeout(() => playTone(1046.50, 'sine', 0.4, 0.1), 300); // C6
};

export const playErrorSound = () => {
  // Low buzz
  playTone(150, 'sawtooth', 0.2, 0.1);
  setTimeout(() => playTone(120, 'sawtooth', 0.3, 0.1), 100);
};

export const playTransitionSound = () => {
  // Subtle swoosh-like tone
  playTone(300, 'sine', 0.1, 0.05);
  setTimeout(() => playTone(250, 'sine', 0.2, 0.03), 50);
};
