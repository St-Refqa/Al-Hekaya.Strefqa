let audioContext: AudioContext | null = null;

function getAudioContext(allowCreate = true) {
  if (!audioContext && allowCreate) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext creation failed', e);
    }
  }
  if (audioContext && audioContext.state === 'suspended' && allowCreate) {
    audioContext.resume().catch(() => {});
  }
  return audioContext;
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  vol: number = 0.1,
  allowCreate = true
) {
  const ctx = getAudioContext(allowCreate);
  if (!ctx) return; // Silent return if not allowed to create or failed

  try {
    const oscillator = ctx.createOscillator();
    const originGain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    originGain.gain.setValueAtTime(0.00001, ctx.currentTime);
    originGain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 0.02);
    originGain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + duration);

    oscillator.connect(originGain);
    originGain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore audio errors to prevent app crash
  }
}

export const playClickSound = () => {
  // A short subtle pop (allowed to initialize AudioContext)
  playTone(600, 'sine', 0.05, 0.1, true);
  setTimeout(() => playTone(800, 'sine', 0.05, 0.05, true), 20);
};

export const playHoverSound = () => {
  // Very soft click (NOT allowed to initialize AudioContext, prevents autoplay warnings on hover)
  playTone(400, 'sine', 0.03, 0.02, false);
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
