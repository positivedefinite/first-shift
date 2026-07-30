/**
 * Procedural cyberpunk score — Web Audio only, no files.
 * Dark pad + sub pulse + wet arpeggio + rain hiss.
 */

export function createMusic() {
  let ctx = null;
  let master = null;
  let running = false;
  let muted = false;
  let intensity = 0.35; // 0..1 from speed
  let nodes = null;
  let timers = [];

  const ROOT = 36.71; // D1-ish for sub

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.02;
    comp.release.value = 0.25;
    comp.connect(master);

    // --- rain / city hiss ---
    const rainGain = ctx.createGain();
    rainGain.gain.value = 0.045;
    rainGain.connect(comp);

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const rain = ctx.createBufferSource();
    rain.buffer = noiseBuf;
    rain.loop = true;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1800;
    rainFilter.Q.value = 0.7;
    rain.connect(rainFilter);
    rainFilter.connect(rainGain);
    rain.start();

    // --- dark pad (two detuned saws via oscillators through filter) ---
    const padGain = ctx.createGain();
    padGain.gain.value = 0.07;
    padGain.connect(comp);

    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 420;
    padFilter.Q.value = 0.6;
    padFilter.connect(padGain);

    const padLfo = ctx.createOscillator();
    padLfo.frequency.value = 0.07;
    const padLfoGain = ctx.createGain();
    padLfoGain.gain.value = 180;
    padLfo.connect(padLfoGain);
    padLfoGain.connect(padFilter.frequency);
    padLfo.start();

    const padOscs = [];
    for (const [semi, detune] of [
      [0, -7],
      [7, 5],
      [12, -3],
      [15, 4],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = ROOT * Math.pow(2, (12 + semi) / 12);
      o.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = 0.22;
      o.connect(g);
      g.connect(padFilter);
      o.start();
      padOscs.push(o);
    }

    // --- sub bass pulse ---
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0;
    bassGain.connect(comp);

    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 120;
    bassFilter.connect(bassGain);

    const bass = ctx.createOscillator();
    bass.type = 'sine';
    bass.frequency.value = ROOT;
    bass.connect(bassFilter);
    bass.start();

    // --- arp voice bus ---
    const arpGain = ctx.createGain();
    arpGain.gain.value = 0.055;
    arpGain.connect(comp);

    const arpFilter = ctx.createBiquadFilter();
    arpFilter.type = 'lowpass';
    arpFilter.frequency.value = 1400;
    arpFilter.Q.value = 2.5;
    arpFilter.connect(arpGain);

    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.28;
    const delayFb = ctx.createGain();
    delayFb.gain.value = 0.38;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0.35;
    arpFilter.connect(delay);
    delay.connect(delayFb);
    delayFb.connect(delay);
    delay.connect(delayWet);
    delayWet.connect(comp);

    nodes = {
      comp,
      rainGain,
      rainFilter,
      padGain,
      padFilter,
      bass,
      bassGain,
      bassFilter,
      arpGain,
      arpFilter,
      delay,
      padOscs,
    };
  }

  function beepArp(semi, when, dur = 0.12) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    const freq = ROOT * Math.pow(2, (24 + semi) / 12);
    o.frequency.value = freq;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(0.18, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    o.connect(g);
    g.connect(nodes.arpFilter);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  function schedulePulse() {
    if (!running || !ctx) return;
    const t = ctx.currentTime;
    const bpm = 72 + intensity * 16;
    const beat = 60 / bpm;

    // bass pump
    const peak = 0.14 + intensity * 0.1;
    nodes.bassGain.gain.cancelScheduledValues(t);
    nodes.bassGain.gain.setValueAtTime(0.001, t);
    nodes.bassGain.gain.exponentialRampToValueAtTime(peak, t + 0.04);
    nodes.bassGain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.85);

    // move bass note every 4 beats
    const step = Math.floor(t / (beat * 4)) % 4;
    const bassSemi = [0, 0, -5, 3][step];
    nodes.bass.frequency.setTargetAtTime(
      ROOT * Math.pow(2, bassSemi / 12),
      t,
      0.05,
    );

    // arp pattern — sparse, rainy
    const pattern = intensity > 0.55
      ? [0, 7, 12, 10, 15, 12, 7, 3]
      : [0, , 7, , 12, , 10, ];
    for (let i = 0; i < 8; i++) {
      const n = pattern[i];
      if (n === undefined) continue;
      if (Math.random() > 0.85 + intensity * 0.1) continue;
      beepArp(n, t + i * (beat / 2), 0.1 + Math.random() * 0.06);
    }

    // filter breathe
    const target = 900 + intensity * 900 + Math.sin(t * 0.4) * 120;
    nodes.arpFilter.frequency.setTargetAtTime(target, t, 0.2);
    nodes.padFilter.frequency.setTargetAtTime(320 + intensity * 280, t, 0.4);
    nodes.rainFilter.frequency.setTargetAtTime(1400 + intensity * 800, t, 0.5);
    nodes.rainGain.gain.setTargetAtTime(0.035 + intensity * 0.025, t, 0.3);

    const id = setTimeout(schedulePulse, beat * 1000);
    timers.push(id);
  }

  function fadeMaster(to, sec = 1.2) {
    if (!master || !ctx) return;
    const t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(master.gain.value, t);
    master.gain.linearRampToValueAtTime(to, t + sec);
  }

  return {
    async start() {
      ensure();
      if (ctx.state === 'suspended') await ctx.resume();
      if (running) {
        fadeMaster(muted ? 0 : 0.55, 0.6);
        return;
      }
      running = true;
      fadeMaster(muted ? 0 : 0.55, 1.4);
      schedulePulse();
    },

    stop(soft = true) {
      if (!running) return;
      fadeMaster(0, soft ? 1.6 : 0.2);
      // keep ctx alive for retry — just silence
    },

    setIntensity(v) {
      intensity = Math.max(0, Math.min(1, v));
    },

    setMuted(m) {
      muted = m;
      if (!master) return;
      fadeMaster(muted || !running ? 0 : 0.55, 0.3);
    },

    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },

    isMuted() {
      return muted;
    },

    winSting() {
      if (!ctx || muted) return;
      ensure();
      const t = ctx.currentTime;
      for (const [i, semi] of [0, 7, 12, 19].entries()) {
        beepArp(semi, t + i * 0.12, 0.35);
      }
    },

    loseSting() {
      if (!ctx || muted) return;
      ensure();
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.8);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 400;
      o.connect(f);
      f.connect(g);
      g.connect(nodes.comp);
      o.start(t);
      o.stop(t + 1);
    },
  };
}
