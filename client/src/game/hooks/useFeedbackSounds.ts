import { useCallback } from 'react';
import { getSharedContext } from './useThockSound';

export const VALID_SOUND_LABELS = ['Wobble', 'Chime', 'Ding', 'Sparkle', 'None'];
export const INVALID_SOUND_LABELS = ['Buzz', 'Thud', 'Bonk', 'None'];
export const DUPLICATE_SOUND_LABELS = ['Wobble', 'Double Tap', 'Muted', 'None'];

export const useFeedbackSounds = (validIndex: number = 0, invalidIndex: number = 0, duplicateIndex: number = 0) => {

  // === VALID SOUNDS ===

  const playChime = (ctx: AudioContext) => {
    const now = ctx.currentTime;

    // Two ascending notes
    [0, 0.1].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 520 : 780;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.1, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.25);
    });
  };

  const playDing = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  };

  const playSparkle = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const freqs = [600, 800, 1000, 1200];

    freqs.forEach((freq, i) => {
      const delay = i * 0.05;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.07, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.15);
    });
  };

  // === INVALID SOUNDS ===

  const playBuzz = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 100;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  };

  const playThud = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  };

  const playBonk = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.12);
  };

  // === DUPLICATE SOUNDS ===

  const playWobble = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(350, now + 0.06);
    osc.frequency.setValueAtTime(280, now + 0.12);
    osc.frequency.setValueAtTime(330, now + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  };

  const playDoubleTap = (ctx: AudioContext) => {
    const now = ctx.currentTime;

    [0, 0.08].forEach((delay) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(200, now + delay);
      osc.frequency.exponentialRampToValueAtTime(80, now + delay + 0.02);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 0.05);
    });
  };

  const playMuted = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 220;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  };

  const playValidWobble = (ctx: AudioContext) => {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.setValueAtTime(350, now + 0.06);
    osc.frequency.setValueAtTime(280, now + 0.12);
    osc.frequency.setValueAtTime(330, now + 0.18);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  };

  const playValid = useCallback(() => {
    try {
      const ctx = getSharedContext();
      switch (validIndex) {
        case 0: playValidWobble(ctx); break;
        case 1: playChime(ctx); break;
        case 2: playDing(ctx); break;
        case 3: playSparkle(ctx); break;
      }
    } catch { /* silent */ }
  }, [validIndex]);

  const playInvalid = useCallback(() => {
    try {
      const ctx = getSharedContext();
      switch (invalidIndex) {
        case 0: playBuzz(ctx); break;
        case 1: playThud(ctx); break;
        case 2: playBonk(ctx); break;
      }
    } catch { /* silent */ }
  }, [invalidIndex]);

  const playDuplicate = useCallback(() => {
    try {
      const ctx = getSharedContext();
      switch (duplicateIndex) {
        case 0: playWobble(ctx); break;
        case 1: playDoubleTap(ctx); break;
        case 2: playMuted(ctx); break;
      }
    } catch { /* silent */ }
  }, [duplicateIndex]);

  return { playValid, playInvalid, playDuplicate };
};
