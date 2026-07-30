/**
 * Procedural score — Web Audio only, no files.
 * Per-district themes; pace climbs suburbs → old town.
 */

/** @typedef {'suburb' | 'borough' | 'downtown' | 'oldtown'} DistrictMode */

const DISTRICTS = {
  suburb: {
    bpmBase: 66,
    bpmDrive: 12,
    root: 36.71, // D
    padSemis: [0, 7, 12, 16], // airy major-ish
    bassLine: [0, 0, 5, 3],
    arpSparse: [0, , 7, , 12, , 5, ],
    arpBusy: [0, 5, 7, 12, 10, 7, 5, 0],
    padCutoff: 260,
    arpWave: 'sine',
    delayTime: 0.36,
    delayFb: 0.32,
    rainTone: 1100,
    rainGain: 0.045,
    arpGain: 0.04,
    padGain: 0.08,
  },
  borough: {
    bpmBase: 84,
    bpmDrive: 14,
    root: 38.89, // Eb
    padSemis: [0, 3, 7, 12], // minor warmth
    bassLine: [0, 0, -5, 3],
    arpSparse: [0, , 7, , 12, , 10, ],
    arpBusy: [0, 7, 12, 10, 15, 12, 7, 3],
    padCutoff: 340,
    arpWave: 'triangle',
    delayTime: 0.28,
    delayFb: 0.38,
    rainTone: 1500,
    rainGain: 0.045,
    arpGain: 0.055,
    padGain: 0.07,
  },
  downtown: {
    bpmBase: 104,
    bpmDrive: 18,
    root: 41.2, // E
    padSemis: [0, 7, 12, 19], // neon fifths
    bassLine: [0, 7, 0, -2],
    arpSparse: [0, 7, 12, , 15, 12, 7, ],
    arpBusy: [0, 7, 12, 15, 19, 15, 12, 7],
    padCutoff: 480,
    arpWave: 'square',
    delayTime: 0.22,
    delayFb: 0.42,
    rainTone: 2000,
    rainGain: 0.05,
    arpGain: 0.07,
    padGain: 0.06,
  },
  oldtown: {
    bpmBase: 122,
    bpmDrive: 20,
    root: 34.65, // C#
    padSemis: [0, 3, 6, 11], // tense gothic
    bassLine: [0, -2, -5, 3],
    arpSparse: [0, 3, , 7, 11, , 6, ],
    arpBusy: [0, 3, 6, 11, 14, 11, 6, 3],
    padCutoff: 300,
    arpWave: 'sawtooth',
    delayTime: 0.18,
    delayFb: 0.48,
    rainTone: 900,
    rainGain: 0.04,
    arpGain: 0.065,
    padGain: 0.075,
  },
  wayback: {
    // Clear-sky bridge — no rain hiss, warm major lullaby
    calm: true,
    bpmBase: 46,
    bpmDrive: 2,
    root: 36.71, // D
    padSemis: [0, 7, 12, 16], // open major
    bassLine: [0, 0, 7, 5],
    arpSparse: [0, , 12, , 7, , 19, ],
    arpBusy: [0, 7, 12, , 16, 12, 7, ],
    padCutoff: 380,
    arpWave: 'sine',
    delayTime: 0.52,
    delayFb: 0.2,
    rainTone: 600,
    rainGain: 0, // dry night — silence the rain bed
    arpGain: 0.028,
    padGain: 0.13,
  },
};

export function createMusic() {
  let ctx = null;
  let master = null;
  let running = false;
  let muted = false;
  let intensity = 0.35; // 0..1 from speed
  let nodes = null;
  let timers = [];
  let ringTimer = null;
  let talkNodes = null;
  let district = DISTRICTS.suburb;
  /** Way Back drama bus — omen → dread → doom */
  let drama = null;

  function rootHz() {
    return district.root;
  }

  function stopDrama(soft = true) {
    if (!drama || !ctx) {
      drama = null;
      return;
    }
    const t = ctx.currentTime;
    const bus = drama.gain;
    const oscs = drama.oscs || [];
    const timersLocal = drama.timers || [];
    for (const id of timersLocal) clearTimeout(id);
    bus.gain.cancelScheduledValues(t);
    bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
    bus.gain.exponentialRampToValueAtTime(0.0001, t + (soft ? 1.4 : 0.12));
    const stopAt = (soft ? 1600 : 150);
    setTimeout(() => {
      for (const o of oscs) {
        try {
          o.stop();
        } catch {
          /* done */
        }
      }
    }, stopAt);
    drama = null;
  }

  function ensureDramaBus() {
    ensure();
    if (drama) return drama;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(nodes.comp);
    drama = { gain, oscs: [], timers: [], dread: 0 };
    return drama;
  }

  function tone(freq, type, when, dur, peak, dest, slideTo = null) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (slideTo != null) {
      o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), when + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g);
    g.connect(dest);
    o.start(when);
    o.stop(when + dur + 0.05);
    return o;
  }

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
    const padDets = [-7, 5, -3, 4];
    for (let i = 0; i < 4; i++) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = district.root * Math.pow(2, (12 + district.padSemis[i]) / 12);
      o.detune.value = padDets[i];
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
    bass.frequency.value = district.root;
    bass.connect(bassFilter);
    bass.start();

    // --- arp voice bus ---
    const arpGain = ctx.createGain();
    arpGain.gain.value = district.arpGain;
    arpGain.connect(comp);

    const arpFilter = ctx.createBiquadFilter();
    arpFilter.type = 'lowpass';
    arpFilter.frequency.value = 1400;
    arpFilter.Q.value = 2.5;
    arpFilter.connect(arpGain);

    const delay = ctx.createDelay(1);
    delay.delayTime.value = district.delayTime;
    const delayFb = ctx.createGain();
    delayFb.gain.value = district.delayFb;
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
      delayFb,
      padOscs,
    };
  }

  function applyDistrictTuning() {
    if (!ctx || !nodes) return;
    const t = ctx.currentTime;
    const r = rootHz();
    for (let i = 0; i < nodes.padOscs.length; i++) {
      const semi = district.padSemis[i] ?? 0;
      nodes.padOscs[i].frequency.setTargetAtTime(
        r * Math.pow(2, (12 + semi) / 12),
        t,
        0.2,
      );
    }
    nodes.bass.frequency.setTargetAtTime(r, t, 0.15);
    nodes.delay.delayTime.setTargetAtTime(district.delayTime, t, 0.2);
    nodes.delayFb.gain.setTargetAtTime(district.delayFb, t, 0.2);
    nodes.padGain.gain.setTargetAtTime(district.padGain, t, 0.25);
    nodes.arpGain.gain.setTargetAtTime(district.arpGain, t, 0.25);
    nodes.padFilter.frequency.setTargetAtTime(district.padCutoff, t, 0.3);
    nodes.rainFilter.frequency.setTargetAtTime(district.rainTone, t, 0.3);
    const rg = district.rainGain ?? 0.045;
    nodes.rainGain.gain.setTargetAtTime(Math.max(0.0001, rg), t, 0.35);
  }

  function beepArp(semi, when, dur = 0.12) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator();
    o.type = district.arpWave || 'triangle';
    const freq = rootHz() * Math.pow(2, (24 + semi) / 12);
    o.frequency.value = freq;

    const g = ctx.createGain();
    const peak = district.arpWave === 'square' || district.arpWave === 'sawtooth' ? 0.12 : 0.18;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(peak, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

    o.connect(g);
    g.connect(nodes.arpFilter);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  function schedulePulse() {
    if (!running || !ctx) return;
    const t = ctx.currentTime;
    const bpm = district.bpmBase + intensity * district.bpmDrive;
    const beat = 60 / bpm;

    // bass pump — softer on Way Back calm stretch
    const calm = !!district.calm;
    const peak = calm
      ? 0.035 + intensity * 0.02
      : 0.12 + intensity * 0.1 + (district.bpmBase - 66) * 0.0004;
    nodes.bassGain.gain.cancelScheduledValues(t);
    nodes.bassGain.gain.setValueAtTime(0.001, t);
    nodes.bassGain.gain.exponentialRampToValueAtTime(Math.max(0.001, peak), t + 0.03);
    nodes.bassGain.gain.exponentialRampToValueAtTime(0.001, t + beat * 0.8);

    const step = Math.floor(t / (beat * 4)) % 4;
    const bassSemi = district.bassLine[step] ?? 0;
    nodes.bass.frequency.setTargetAtTime(
      rootHz() * Math.pow(2, bassSemi / 12),
      t,
      0.04,
    );

    const pattern = intensity > 0.5 && !calm ? district.arpBusy : district.arpSparse;
    const density = calm
      ? 0.42 + intensity * 0.08
      : 0.78 + intensity * 0.15 + (district.bpmBase - 66) * 0.001;
    for (let i = 0; i < 8; i++) {
      const n = pattern[i];
      if (n === undefined) continue;
      if (Math.random() > density) continue;
      beepArp(n, t + i * (beat / 2), calm ? 0.14 + Math.random() * 0.08 : 0.08 + Math.random() * 0.05);
    }

    const arpOpen = calm
      ? 900 + intensity * 200 + Math.sin(t * 0.25) * 60
      : 700 + intensity * 1000 + Math.sin(t * 0.4) * 100 + (district.bpmBase - 66) * 4;
    nodes.arpFilter.frequency.setTargetAtTime(arpOpen, t, 0.15);
    nodes.padFilter.frequency.setTargetAtTime(
      district.padCutoff + intensity * (calm ? 80 : 220),
      t,
      0.35,
    );
    nodes.rainFilter.frequency.setTargetAtTime(
      district.rainTone + intensity * 600,
      t,
      0.4,
    );
    const rainTarget = district.rainGain ?? 0.03 + intensity * 0.03;
    nodes.rainGain.gain.setTargetAtTime(Math.max(0.0001, rainTarget), t, 0.3);

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
    /** Switch district score — pace + color. Call before / with start(). */
    setDistrict(mode) {
      district = DISTRICTS[mode] || DISTRICTS.suburb;
      ensure();
      applyDistrictTuning();
    },

    async start() {
      ensure();
      applyDistrictTuning();
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

    /** Wet crack / bone snaps — way back finale */
    boneCrack() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const n = Math.floor(ctx.sampleRate * 0.12);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const env = Math.exp(-i / (n * 0.12));
        data[i] = (Math.random() * 2 - 1) * env;
      }
      // Layered dry snaps
      for (const [delay, rate, vol] of [
        [0, 1.0, 0.7],
        [0.09, 1.35, 0.55],
        [0.18, 0.7, 0.65],
        [0.32, 1.8, 0.4],
        [0.55, 0.55, 0.5],
        [0.85, 1.1, 0.35],
      ]) {
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.playbackRate.value = rate;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 800 + Math.random() * 2200;
        bp.Q.value = 2.5;
        const g = ctx.createGain();
        const when = t + delay;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(vol, when + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.14);
        src.connect(bp);
        bp.connect(g);
        g.connect(nodes.comp);
        src.start(when);
        src.stop(when + 0.2);
      }
      // Low body thud
      const thud = ctx.createOscillator();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(90, t);
      thud.frequency.exponentialRampToValueAtTime(28, t + 0.5);
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.0001, t);
      tg.gain.exponentialRampToValueAtTime(0.55, t + 0.02);
      tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      thud.connect(tg);
      tg.connect(nodes.comp);
      thud.start(t);
      thud.stop(t + 0.75);
    },

    /** Warm chime — coffee tip */
    pickup() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      for (const [i, semi] of [12, 19, 24].entries()) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = rootHz() * Math.pow(2, (24 + semi) / 12);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + i * 0.05);
        g.gain.exponentialRampToValueAtTime(0.16, t + i * 0.05 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.05 + 0.35);
        o.connect(g);
        g.connect(nodes.comp);
        o.start(t + i * 0.05);
        o.stop(t + i * 0.05 + 0.4);
      }
    },

    /** Harsh thud — obstacle hit */
    hit() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.25, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);

      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 280;
      bp.Q.value = 0.8;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.35, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(nodes.comp);
      src.start(t);
      src.stop(t + 0.25);

      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(90, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 0.28);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g);
      g.connect(nodes.comp);
      o.start(t);
      o.stop(t + 0.32);
    },

    /** Classic dual-tone ringtone — loops until stopRingtone */
    startRingtone() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      this.stopRingtone();

      const chirp = () => {
        if (!ctx || muted) return;
        const t = ctx.currentTime;
        for (const [i, freq] of [440, 480].entries()) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
          g.gain.setValueAtTime(0.09, t + 0.35);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
          o.connect(g);
          g.connect(nodes.comp);
          o.start(t);
          o.stop(t + 0.45);
        }
        // second pulse in the pair
        for (const freq of [440, 480]) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = freq;
          const g = ctx.createGain();
          const t2 = t + 0.5;
          g.gain.setValueAtTime(0.0001, t2);
          g.gain.exponentialRampToValueAtTime(0.09, t2 + 0.02);
          g.gain.setValueAtTime(0.09, t2 + 0.35);
          g.gain.exponentialRampToValueAtTime(0.0001, t2 + 0.42);
          o.connect(g);
          g.connect(nodes.comp);
          o.start(t2);
          o.stop(t2 + 0.45);
        }
      };

      chirp();
      ringTimer = setInterval(chirp, 1400);
    },

    stopRingtone() {
      if (ringTimer) {
        clearInterval(ringTimer);
        ringTimer = null;
      }
    },

    /** Phone talk — `normal` / `boss` bla-bla, or `weird` distorted (~4s) */
    startTalk(style = 'normal') {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      this.stopTalk();
      this.stopRingtone();
      if (style === 'weird') {
        this._startTalkWeird();
        return;
      }
      this._startTalkHuman(style === 'boss' ? 'boss' : 'normal');
    },

    /**
     * Formant “bla bla bla” — glottal + vowels + syllable gate.
     * `boss` = deeper, slower, gruffer.
     */
    _startTalkHuman(kind = 'normal') {
      const t = ctx.currentTime;
      const boss = kind === 'boss';
      const dur = boss ? 4.4 : 4.15;
      const stoppers = [];

      const glottal = ctx.createOscillator();
      glottal.type = boss ? 'square' : 'sawtooth';
      if (boss) {
        // Male / barked orders
        glottal.frequency.setValueAtTime(118, t);
        glottal.frequency.linearRampToValueAtTime(95, t + 1.0);
        glottal.frequency.linearRampToValueAtTime(130, t + 2.0);
        glottal.frequency.linearRampToValueAtTime(105, t + 3.1);
        glottal.frequency.linearRampToValueAtTime(122, t + dur);
      } else {
        // Female-ish phone voice
        glottal.frequency.setValueAtTime(205, t);
        glottal.frequency.linearRampToValueAtTime(175, t + 0.9);
        glottal.frequency.linearRampToValueAtTime(230, t + 1.8);
        glottal.frequency.linearRampToValueAtTime(190, t + 2.7);
        glottal.frequency.linearRampToValueAtTime(215, t + dur);
      }

      const vib = ctx.createOscillator();
      vib.type = 'sine';
      vib.frequency.value = boss ? 3.8 : 5.8;
      const vibG = ctx.createGain();
      vibG.gain.value = boss ? 4 : 7;
      vib.connect(vibG);
      vibG.connect(glottal.frequency);

      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.Q.value = boss ? 4.5 : 6;
      f1.frequency.value = boss ? 450 : 650;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.Q.value = boss ? 5 : 7;
      f2.frequency.value = boss ? 900 : 1400;

      // Duck score so talk dominates
      if (nodes.padGain) nodes.padGain.gain.setTargetAtTime(0.015, t, 0.08);
      if (nodes.arpGain) nodes.arpGain.gain.setTargetAtTime(0.012, t, 0.08);
      if (nodes.rainGain) {
        nodes.rainGain.gain.setTargetAtTime(
          district.rainGain === 0 ? 0.0001 : 0.02,
          t,
          0.1,
        );
      }

      const mix = ctx.createGain();
      mix.gain.value = boss ? 1.35 : 1.15;

      const phone = ctx.createBiquadFilter();
      phone.type = 'bandpass';
      phone.frequency.value = boss ? 1200 : 1600;
      phone.Q.value = 0.85;

      const gate = ctx.createGain();
      gate.gain.value = 0.0001;

      const out = ctx.createGain();
      const peakOut = boss ? 1.55 : 1.4;
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(peakOut, t + 0.06);
      out.gain.setValueAtTime(peakOut, t + dur - 0.25);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      glottal.connect(f1);
      glottal.connect(f2);
      f1.connect(mix);
      f2.connect(mix);
      mix.connect(gate);
      gate.connect(phone);
      phone.connect(out);
      out.connect(nodes.comp);

      const nLen = Math.floor(ctx.sampleRate * 0.04);
      const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < nLen; i++) nData[i] = (Math.random() * 2 - 1) * (1 - i / nLen);

      const vowels = boss
        ? [
            [450, 850],
            [380, 700],
            [500, 950],
            [420, 1100],
            [360, 780],
          ]
        : [
            [700, 1100],
            [500, 1700],
            [400, 800],
            [350, 2100],
            [600, 1200],
          ];
      const syl = boss ? 0.22 : 0.16;
      let sylI = 0;
      for (let when = t + 0.05; when < t + dur - 0.2; when += syl) {
        if (sylI % (boss ? 5 : 7) === (boss ? 4 : 6)) {
          sylI += 1;
          continue;
        }
        const v = vowels[sylI % vowels.length];
        f1.frequency.setValueAtTime(v[0] + (Math.random() - 0.5) * 30, when);
        f2.frequency.setValueAtTime(v[1] + (Math.random() - 0.5) * 50, when);

        const peak = (boss ? 1.15 : 1.0) + Math.random() * 0.35;
        const open = (boss ? 0.1 : 0.07) + Math.random() * 0.05;
        gate.gain.setValueAtTime(0.0001, when);
        gate.gain.exponentialRampToValueAtTime(peak, when + 0.018);
        gate.gain.exponentialRampToValueAtTime(0.0001, when + open);

        const click = ctx.createBufferSource();
        click.buffer = nBuf;
        const cg = ctx.createGain();
        cg.gain.value = boss ? 0.55 : 0.45;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = boss ? 600 : 900;
        click.connect(hp);
        hp.connect(cg);
        cg.connect(phone);
        click.start(when);
        click.stop(when + 0.04);
        stoppers.push(click);

        sylI += 1;
      }

      glottal.start(t);
      glottal.stop(t + dur);
      vib.start(t);
      vib.stop(t + dur);
      stoppers.push(glottal, vib);

      talkNodes = {
        stop() {
          for (const n of stoppers) {
            try {
              n.stop();
            } catch {
              /* */
            }
          }
        },
      };
    },

    _startTalkWeird() {
      const t = ctx.currentTime;
      const dur = 3.2;
      const stoppers = [];

      // Harsh clipped "voices" — chopped noise through crushing waveshape
      const n = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < n; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.92 + white * 0.08;
        const syllable = Math.pow(Math.abs(Math.sin(i * 0.0013 + Math.sin(i * 0.00011) * 8)), 0.35);
        const stutter = (Math.floor(i / 900) % 3 === 0) ? 0.15 : 1;
        let s = last * syllable * stutter * 1.8;
        // soft clip → ugly
        s = Math.tanh(s * 3.2);
        // occasional dropouts
        if ((i % 2200) < 80) s *= 0.05;
        data[i] = s;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = 0.72;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 480;
      bp.Q.value = 2.4;

      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 180;

      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i / 128) - 1;
        curve[i] = Math.tanh(x * 4) * 0.9 + (Math.random() - 0.5) * 0.02;
      }
      shaper.curve = curve;

      const delay = ctx.createDelay(0.5);
      delay.delayTime.value = 0.11;
      const fb = ctx.createGain();
      fb.gain.value = 0.55;
      delay.connect(fb);
      fb.connect(delay);

      if (nodes.padGain) nodes.padGain.gain.setTargetAtTime(0.015, t, 0.08);
      if (nodes.arpGain) nodes.arpGain.gain.setTargetAtTime(0.012, t, 0.08);
      if (nodes.rainGain) {
        nodes.rainGain.gain.setTargetAtTime(
          district.rainGain === 0 ? 0.0001 : 0.02,
          t,
          0.1,
        );
      }

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.85, t + 0.12);
      g.gain.setValueAtTime(0.85, t + dur - 0.35);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      src.connect(bp);
      bp.connect(hp);
      hp.connect(shaper);
      shaper.connect(g);
      shaper.connect(delay);
      delay.connect(g);
      g.connect(nodes.comp);
      src.start(t);
      src.stop(t + dur);
      stoppers.push(src);

      // Detuned moan stack
      for (const [freq, type, vol] of [
        [55, 'sawtooth', 0.16],
        [82, 'sine', 0.14],
        [110, 'triangle', 0.12],
        [220.5, 'sawtooth', 0.08],
      ]) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * (0.7 + Math.random() * 0.2), t + dur);
        const og = ctx.createGain();
        og.gain.setValueAtTime(0.0001, t);
        og.gain.exponentialRampToValueAtTime(vol, t + 0.2);
        og.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 2.2 + Math.random() * 3;
        const lfoG = ctx.createGain();
        lfoG.gain.value = freq * 0.04;
        lfo.connect(lfoG);
        lfoG.connect(o.frequency);
        o.connect(og);
        og.connect(nodes.comp);
        o.start(t);
        o.stop(t + dur);
        lfo.start(t);
        lfo.stop(t + dur);
        stoppers.push(o, lfo);
      }

      // Ring-mod screech blips
      for (let i = 0; i < 5; i++) {
        const when = t + 0.35 + i * 0.48;
        const a = ctx.createOscillator();
        a.type = 'square';
        a.frequency.value = 180 + Math.random() * 90;
        const b = ctx.createOscillator();
        b.type = 'sine';
        b.frequency.value = 900 + Math.random() * 1400;
        const ag = ctx.createGain();
        ag.gain.setValueAtTime(0.0001, when);
        ag.gain.exponentialRampToValueAtTime(0.07, when + 0.02);
        ag.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
        // Cheap ring-mod: multiply via gain modulation
        const ring = ctx.createGain();
        ring.gain.value = 0;
        b.connect(ring.gain);
        a.connect(ring);
        ring.connect(ag);
        ag.connect(nodes.comp);
        a.start(when);
        a.stop(when + 0.3);
        b.start(when);
        b.stop(when + 0.3);
        stoppers.push(a, b);
      }

      talkNodes = {
        stop() {
          for (const n of stoppers) {
            try {
              n.stop();
            } catch {
              /* */
            }
          }
        },
      };
    },

    stopTalk() {
      if (talkNodes) {
        try {
          talkNodes.stop();
        } catch {
          /* already stopped */
        }
        talkNodes = null;
      }
      // Restore score after talk duck
      if (ctx && nodes) {
        const t = ctx.currentTime;
        if (nodes.padGain) nodes.padGain.gain.setTargetAtTime(district.padGain, t, 0.12);
        if (nodes.arpGain) nodes.arpGain.gain.setTargetAtTime(district.arpGain, t, 0.12);
        if (nodes.rainGain) {
          nodes.rainGain.gain.setTargetAtTime(
            Math.max(0.0001, district.rainGain ?? 0.045),
            t,
            0.15,
          );
        }
      }
    },

    /** Angry text notification blip */
    textBlip() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      for (const [i, freq] of [880, 1175].entries()) {
        const o = ctx.createOscillator();
        o.type = 'square';
        o.frequency.value = freq;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.1, t + i * 0.07 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.07 + 0.12);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 2200;
        o.connect(f);
        f.connect(g);
        g.connect(nodes.comp);
        o.start(t + i * 0.07);
        o.stop(t + i * 0.07 + 0.15);
      }
    },

    /** Way Back — slight wrongness at omen (keep it uneasy, not apocalyptic) */
    omenSting() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const bus = ensureDramaBus();
      const t = ctx.currentTime;

      // Soft duck — calm theme mostly stays
      if (nodes.padGain) nodes.padGain.gain.setTargetAtTime(0.06, t, 0.2);
      if (nodes.arpGain) nodes.arpGain.gain.setTargetAtTime(0.02, t, 0.2);
      fadeMaster(muted ? 0 : 0.58, 0.4);

      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(0.0001, t);
      bus.gain.exponentialRampToValueAtTime(0.28, t + 0.12);
      bus.gain.exponentialRampToValueAtTime(0.14, t + 1.1);

      // Thin uneasy tones — not a brass wall
      for (const freq of [65.4, 69.3, 98]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 0.97, t + 1.1);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = 420;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.1, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        o.connect(f);
        f.connect(g);
        g.connect(bus.gain);
        o.start(t);
        o.stop(t + 1.25);
        bus.oscs.push(o);
      }

      // One soft heart thud
      tone(62, 'sine', t + 0.05, 0.3, 0.22, bus.gain, 36);

      this.spanDread();
    },

    /** Sustained dread under the locked stretch */
    spanDread() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const bus = ensureDramaBus();
      const t = ctx.currentTime;

      // Quiet pedal — builds later via setDread
      if (!drama.droneStarted) {
        drama.droneStarted = true;
        for (const [freq, type, vol] of [
          [32.7, 'sine', 0.18],
          [46.25, 'triangle', 0.08],
          [65.4, 'sine', 0.04],
        ]) {
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.value = freq;
          const f = ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = 140;
          const g = ctx.createGain();
          g.gain.value = vol;
          o.connect(f);
          f.connect(g);
          g.connect(bus.gain);
          o.start(t);
          bus.oscs.push(o);
        }

        // Slow heartbeat — quiet at first
        const beat = () => {
          if (!drama || muted) return;
          const now = ctx.currentTime;
          const hot = drama.dread;
          tone(58, 'sine', now, 0.28, 0.12 + hot * 0.35, bus.gain, 28);
          if (hot > 0.35) {
            tone(48, 'sine', now + 0.16, 0.3, 0.08 + hot * 0.22, bus.gain, 24);
          }
          const id = setTimeout(beat, 880 - hot * 280);
          drama.timers.push(id);
        };
        beat();
      }

      bus.gain.cancelScheduledValues(t);
      const cur = Math.max(0.0001, bus.gain.value);
      bus.gain.setValueAtTime(cur, t);
      bus.gain.linearRampToValueAtTime(0.18, t + 1.2);
    },

    /** 0..1 — raise dread over the locked stretch */
    setDread(u) {
      if (!drama || !ctx) return;
      drama.dread = Math.max(0, Math.min(1, u));
      const t = ctx.currentTime;
      const target = 0.16 + drama.dread * 0.5;
      drama.gain.gain.setTargetAtTime(target, t, 0.5);
      if (nodes.padGain) {
        nodes.padGain.gain.setTargetAtTime(0.055 * (1 - drama.dread * 0.55), t, 0.5);
      }
      if (nodes.arpGain) {
        nodes.arpGain.gain.setTargetAtTime(0.018 * (1 - drama.dread * 0.7), t, 0.5);
      }
    },

    /** Whiteout + left-side detonation */
    flashBang() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      fadeMaster(muted ? 0 : 0.95, 0.05);

      // Noise blast
      const n = Math.floor(ctx.sampleRate * 0.55);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        const env = Math.exp(-i / (n * 0.18));
        data[i] = (Math.random() * 2 - 1) * env;
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(1200, t);
      bp.frequency.exponentialRampToValueAtTime(180, t + 0.45);
      bp.Q.value = 0.6;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.85, t + 0.02);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(nodes.comp);
      src.start(t);
      src.stop(t + 0.75);

      // Sub boom (left-feeling via low thump)
      for (const [freq, dur, peak, delay] of [
        [48, 0.9, 0.9, 0],
        [36, 1.2, 0.7, 0.04],
        [90, 0.35, 0.45, 0.08],
      ]) {
        tone(freq, 'sine', t + delay, dur, peak, nodes.comp, freq * 0.35);
      }
    },

    /** Soft wipeout onset — score becomes a disaster */
    doomRise() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const bus = ensureDramaBus();
      const t = ctx.currentTime;

      fadeMaster(muted ? 0 : 0.85, 0.4);
      if (nodes.padGain) nodes.padGain.gain.setTargetAtTime(0.01, t, 0.2);
      if (nodes.arpGain) nodes.arpGain.gain.setTargetAtTime(0.004, t, 0.2);
      if (nodes.rainGain) {
        nodes.rainGain.gain.setTargetAtTime(
          district.rainGain === 0 ? 0.0001 : 0.01,
          t,
          0.2,
        );
      }

      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
      bus.gain.linearRampToValueAtTime(0.95, t + 1.2);

      // Rising alarm scream
      const alarm = ctx.createOscillator();
      alarm.type = 'sawtooth';
      alarm.frequency.setValueAtTime(110, t);
      alarm.frequency.exponentialRampToValueAtTime(440, t + 3.2);
      const af = ctx.createBiquadFilter();
      af.type = 'bandpass';
      af.frequency.setValueAtTime(400, t);
      af.frequency.exponentialRampToValueAtTime(1800, t + 3);
      af.Q.value = 4;
      const ag = ctx.createGain();
      ag.gain.setValueAtTime(0.0001, t);
      ag.gain.exponentialRampToValueAtTime(0.2, t + 0.4);
      ag.gain.linearRampToValueAtTime(0.28, t + 2.5);
      alarm.connect(af);
      af.connect(ag);
      ag.connect(bus.gain);
      alarm.start(t);
      alarm.stop(t + 4.5);
      bus.oscs.push(alarm);

      // Choir-ish stacked fifths climbing
      for (const [i, freq] of [82.41, 123.47, 164.81, 246.94].entries()) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(freq, t);
        o.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 3.5);
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(600 + i * 120, t);
        f.frequency.linearRampToValueAtTime(2200, t + 3);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.1, t + 0.3 + i * 0.08);
        o.connect(f);
        f.connect(g);
        g.connect(bus.gain);
        o.start(t);
        o.stop(t + 5);
        bus.oscs.push(o);
      }

      // Impact hits
      for (const delay of [0, 0.9, 1.7]) {
        tone(48, 'sine', t + delay, 0.55, 0.7, bus.gain, 22);
        tone(36, 'triangle', t + delay + 0.02, 0.4, 0.35, bus.gain, 20);
      }
    },

    /** Hard lurch — everything peaks */
    doomPeak() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const bus = ensureDramaBus();
      const t = ctx.currentTime;

      fadeMaster(muted ? 0 : 0.95, 0.15);
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(Math.max(0.0001, bus.gain.value), t);
      bus.gain.linearRampToValueAtTime(1.15, t + 0.2);

      // Chaos noise bed
      const n = Math.floor(ctx.sampleRate * 2.2);
      const buf = ctx.createBuffer(1, n, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < n; i++) {
        data[i] = (Math.random() * 2 - 1) * (0.3 + (i / n) * 0.7);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(200, t);
      bp.frequency.exponentialRampToValueAtTime(2400, t + 1.8);
      bp.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.35, t + 0.15);
      ng.gain.linearRampToValueAtTime(0.45, t + 1.5);
      src.connect(bp);
      bp.connect(ng);
      ng.connect(bus.gain);
      src.start(t);
      src.stop(t + 2.2);

      for (const delay of [0, 0.35, 0.7, 1.1]) {
        tone(90, 'sawtooth', t + delay, 0.25, 0.4, bus.gain, 40);
      }
    },

    /** End screen — let the disaster die out */
    doomEnd() {
      stopDrama(true);
      if (!ctx || !nodes) return;
      const t = ctx.currentTime;
      if (nodes.padGain) nodes.padGain.gain.setTargetAtTime(0.0001, t, 0.4);
      if (nodes.arpGain) nodes.arpGain.gain.setTargetAtTime(0.0001, t, 0.4);
      fadeMaster(0, 2.2);
      running = false;
    },

    clearDrama() {
      stopDrama(false);
    },
  };
}
