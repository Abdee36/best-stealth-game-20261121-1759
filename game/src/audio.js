// Sound, synthesized in the browser with WebAudio: no audio files, no
// network. Footsteps tick softly, a key chimes, the alarm stings when the
// meter crosses the danger line, and the win plays a short lantern chord.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, gain, when = 0) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur + 0.05);
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    /** A soft footstep tick; quieter while sneaking (the world never calls it then). */
    step() {
      tone(180 + Math.random() * 40, 0.06, 'sine', 0.05);
    },
    key() {
      tone(660, 0.16, 'sine', 0.12);
      tone(990, 0.22, 'sine', 0.1, 0.09);
    },
    alarm() {
      tone(220, 0.28, 'sawtooth', 0.09);
      tone(175, 0.32, 'sawtooth', 0.09, 0.14);
    },
    caught() {
      tone(140, 0.4, 'square', 0.08);
      tone(90, 0.5, 'square', 0.08, 0.16);
    },
    win() {
      tone(523, 0.25, 'sine', 0.12);
      tone(659, 0.25, 'sine', 0.12, 0.12);
      tone(784, 0.4, 'sine', 0.12, 0.24);
    },
  };
}
