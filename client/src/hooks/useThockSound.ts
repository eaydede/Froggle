import { useCallback } from 'react';

export const SOUND_LABELS = ['Trackpad', 'Typewriter', 'Pop', 'Tap', 'None'];
export const SOUND_STYLES = ['trackpad', 'typewriter', 'pop', 'tap', 'none'];

// Shared AudioContext across all sound hooks
let sharedAudioContext: AudioContext | null = null;

function getSharedContext(): AudioContext {
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext();
  }
  // Resume if suspended (required on mobile after user gesture)
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume();
  }
  return sharedAudioContext;
}

export { getSharedContext };

export const useThockSound = (soundIndex: number = 0) => {

  const playTrackpad = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.015);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.03);
  };

  const playTypewriter = (ctx: AudioContext) => {
    const now = ctx.currentTime;

    // Sharp click with noise
    const bufferSize = ctx.sampleRate * 0.02;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 12);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 2000;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.025);
  };

  const playPop = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.06);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  };

  const playTap = (ctx: AudioContext) => {
    const now = ctx.currentTime;

    // Muted knock
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.02);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.04);
  };

  const playThock = useCallback(() => {
    const style = SOUND_STYLES[soundIndex] || 'none';
    if (style === 'none') return;

    try {
      const ctx = getSharedContext();

      switch (style) {
        case 'trackpad': playTrackpad(ctx); break;
        case 'typewriter': playTypewriter(ctx); break;
        case 'pop': playPop(ctx); break;
        case 'tap': playTap(ctx); break;
      }
    } catch {
      // Silently fail if audio isn't available
    }
  }, [soundIndex]);

  return playThock;
};
