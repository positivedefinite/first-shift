/**
 * Graphics quality — HIGH (default) / LOW.
 * Persisted. Affects DPR, bloom, rain, lamps, neon, towers, windows.
 */

const KEY = 'one-last-shift-quality';
const LEGACY_KEY = 'first-shift-quality';

if (!localStorage.getItem(KEY)) {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) localStorage.setItem(KEY, legacy);
}

/** @returns {'high' | 'low'} */
export function getQuality() {
  return localStorage.getItem(KEY) === 'low' ? 'low' : 'high';
}

/** @param {'high' | 'low'} q */
export function setQuality(q) {
  localStorage.setItem(KEY, q === 'low' ? 'low' : 'high');
}

/** @returns {'high' | 'low'} */
export function toggleQuality() {
  const next = getQuality() === 'high' ? 'low' : 'high';
  setQuality(next);
  return next;
}

export function qualityPrefs() {
  const high = getQuality() === 'high';
  return {
    mode: high ? 'high' : 'low',
    antialias: high,
    dprCap: high ? 1.1 : 1.0,
    rainCount: high ? 650 : 320,
    lampStrideExtra: high ? 1 : 3,
    sidewalkLightChance: high ? 0.22 : 0.08,
    neonMul: high ? 0.85 : 0.5,
    towerMul: high ? 0.75 : 0.4,
    windowCols: high ? 2 : 2,
    maxLitStories: high ? 6 : 4,
    /** Fraction of window slots that actually light up */
    windowLitChance: high ? 0.55 : 0.35,
    denseFacades: high,
    /** @param {[number, number, number]} themeBloom */
    bloom(themeBloom) {
      if (high) {
        return [
          themeBloom[0] * 0.9,
          themeBloom[1],
          Math.min(0.9, themeBloom[2] + 0.04),
        ];
      }
      // LOW: bloom off — biggest cheap GPU win
      return [0, themeBloom[1] * 0.85, 0.95];
    },
  };
}

export function qualityLabel() {
  return getQuality() === 'high' ? 'GRAPHICS · HIGH' : 'GRAPHICS · LOW';
}
