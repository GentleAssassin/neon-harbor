// All sound is synthesized with WebAudio — no audio files, no network. A soft synthwave
// bass loop under the game, and short one-shot effects for the actions that need feedback.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;
  /** Audio only starts after a user gesture (Enter / click); before that, every call
   * is a no-op, so headless runs and screenshots stay silent instead of warning. */
  let unlocked = false;

  // A gentle sunset bassline: A minor, one bar looping, soft triangle wave.
  const BASS = [110, 0, 110, 0, 130.81, 0, 98, 0, 110, 0, 110, 0, 164.81, 0, 146.83, 0];

  function ensure() {
    if (!unlocked) return false;
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 320;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineOsc.start();
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenGain.connect(master);
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenOsc.connect(sirenGain);
      sirenOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 1200;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  return {
    unlock() {
      unlocked = true;
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() {
      return muted;
    },
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTimer = window.setInterval(() => {
        if (muted || !ctx) return;
        const freq = BASS[step % BASS.length];
        step += 1;
        if (!freq) return;
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.connect(gain);
        gain.connect(musicGain);
        osc.start(t);
        osc.stop(t + 0.3);
      }, 150);
    },
    setEngine(amount) {
      if (!ensure()) return;
      engineGain.gain.setTargetAtTime(muted ? 0 : amount * 0.06, ctx.currentTime, 0.1);
      engineOsc.frequency.setTargetAtTime(55 + amount * 90, ctx.currentTime, 0.1);
    },
    setSiren(on) {
      if (!ensure()) return;
      sirenGain.gain.setTargetAtTime(on && !muted ? 0.035 : 0, ctx.currentTime, 0.2);
      if (on) sirenOsc.frequency.setTargetAtTime(700 + Math.sin(performance.now() / 280) * 180, ctx.currentTime, 0.05);
    },
    sfx(name) {
      if (!ensure()) return;
      switch (name) {
        case 'shoot': noise(0.12, 0.5, 2600); tone(180, 0.08, 'square', 0.25, 60); break;
        case 'punch': noise(0.08, 0.4, 500); break;
        case 'hit': tone(140, 0.12, 'sawtooth', 0.3, 70); break;
        case 'pickup': tone(660, 0.1, 'sine', 0.3); tone(990, 0.16, 'sine', 0.3); break;
        case 'cash': tone(880, 0.09, 'triangle', 0.3); tone(1174, 0.09, 'triangle', 0.3); tone(1568, 0.18, 'triangle', 0.3); break;
        case 'mission': [523, 659, 784, 1046].forEach((f, i) => window.setTimeout(() => tone(f, 0.22, 'triangle', 0.3), i * 90)); break;
        case 'steal': tone(320, 0.15, 'square', 0.2, 520); break;
        case 'busted': tone(392, 0.3, 'sawtooth', 0.3, 196); tone(196, 0.5, 'sawtooth', 0.3, 98); break;
        case 'crash': noise(0.25, 0.5, 700); break;
        case 'horn': tone(370, 0.18, 'square', 0.15); tone(440, 0.18, 'square', 0.15); break;
        default: break;
      }
    },
  };
}
