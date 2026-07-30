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
  let ringTimer = null;
  let talkNodes = null;

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

    /** Warm chime — coffee tip */
    pickup() {
      if (muted) return;
      ensure();
      if (ctx.state === 'suspended') ctx.resume();
      const t = ctx.currentTime;
      for (const [i, semi] of [12, 19, 24].entries()) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = ROOT * Math.pow(2, (24 + semi) / 12);
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

    /** Phone talk — `normal` human-ish bla-bla or `weird` distorted (~4s) */
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
      this._startTalkHuman();
    },

    /** Formant “bla bla bla” — glottal buzz + vowels + syllable gate */
    _startTalkHuman() {
      const t = ctx.currentTime;
      const dur = 4.15;
      const stoppers = [];

      // Glottal source (female-ish phone voice)
      const glottal = ctx.createOscillator();
      glottal.type = 'sawtooth';
      glottal.frequency.setValueAtTime(205, t);
      glottal.frequency.linearRampToValueAtTime(175, t + 0.9);
      glottal.frequency.linearRampToValueAtTime(230, t + 1.8);
      glottal.frequency.linearRampToValueAtTime(190, t + 2.7);
      glottal.frequency.linearRampToValueAtTime(215, t + dur);

      const vib = ctx.createOscillator();
      vib.type = 'sine';
      vib.frequency.value = 5.8;
      const vibG = ctx.createGain();
      vibG.gain.value = 7;
      vib.connect(vibG);
      vibG.connect(glottal.frequency);

      // Two formants → vowel shape
      const f1 = ctx.createBiquadFilter();
      f1.type = 'bandpass';
      f1.Q.value = 6;
      f1.frequency.value = 650;
      const f2 = ctx.createBiquadFilter();
      f2.type = 'bandpass';
      f2.Q.value = 7;
      f2.frequency.value = 1400;

      const mix = ctx.createGain();
      mix.gain.value = 0.55;

      // Earpiece tin
      const phone = ctx.createBiquadFilter();
      phone.type = 'bandpass';
      phone.frequency.value = 1600;
      phone.Q.value = 0.85;

      const gate = ctx.createGain();
      gate.gain.value = 0.0001;

      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, t);
      out.gain.exponentialRampToValueAtTime(0.55, t + 0.06);
      out.gain.setValueAtTime(0.55, t + dur - 0.25);
      out.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      glottal.connect(f1);
      glottal.connect(f2);
      f1.connect(mix);
      f2.connect(mix);
      mix.connect(gate);
      gate.connect(phone);
      phone.connect(out);
      out.connect(nodes.comp);

      // Consonant clicks (the “b” in bla)
      const nLen = Math.floor(ctx.sampleRate * 0.04);
      const nBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < nLen; i++) nData[i] = (Math.random() * 2 - 1) * (1 - i / nLen);

      // Vowels: ah / eh / oo / ih — cycle like chatter
      const vowels = [
        [700, 1100],
        [500, 1700],
        [400, 800],
        [350, 2100],
        [600, 1200],
      ];
      const syl = 0.16;
      let sylI = 0;
      for (let when = t + 0.05; when < t + dur - 0.2; when += syl) {
        // Breath / pause every ~6 syllables
        if (sylI % 7 === 6) {
          sylI += 1;
          continue;
        }
        const v = vowels[sylI % vowels.length];
        f1.frequency.setValueAtTime(v[0] + (Math.random() - 0.5) * 40, when);
        f2.frequency.setValueAtTime(v[1] + (Math.random() - 0.5) * 80, when);

        const peak = 0.7 + Math.random() * 0.35;
        const open = 0.07 + Math.random() * 0.05;
        gate.gain.setValueAtTime(0.0001, when);
        gate.gain.exponentialRampToValueAtTime(peak, when + 0.018);
        gate.gain.exponentialRampToValueAtTime(0.0001, when + open);

        // Plosive blip at syllable start
        const click = ctx.createBufferSource();
        click.buffer = nBuf;
        const cg = ctx.createGain();
        cg.gain.value = 0.22;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 900;
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

      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.12);
      g.gain.setValueAtTime(0.28, t + dur - 0.35);
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
        [55, 'sawtooth', 0.06],
        [82, 'sine', 0.05],
        [110, 'triangle', 0.04],
        [220.5, 'sawtooth', 0.025],
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
      if (!talkNodes) return;
      try {
        talkNodes.stop();
      } catch {
        /* already stopped */
      }
      talkNodes = null;
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
  };
}
