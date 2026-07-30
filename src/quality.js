/**
 * Graphics quality — HIGH (default) / LOW.
 * Persisted. Affects DPR, bloom, rain, lamps, neon, towers, windows.
 */

const KEY = 'first-shift-quality';

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
    dprCap: high ? 1.25 : 1.0,
    rainCount: high ? 900 : 400,
    lampStrideExtra: high ? 0 : 2,
    sidewalkLightChance: high ? 0.4 : 0.12,
    neonMul: high ? 1 : 0.65,
    towerMul: high ? 1 : 0.5,
    windowCols: high ? 3 : 2,
    maxLitStories: high ? 99 : 5,
    denseFacades: high,
    /** @param {[number, number, number]} themeBloom */
    bloom(themeBloom) {
      if (high) return themeBloom;
      return [
        themeBloom[0] * 0.64,
        themeBloom[1] * 0.9,
        Math.min(0.92, themeBloom[2] + 0.15),
      ];
    },
  };
}

export function qualityLabel() {
  return getQuality() === 'high' ? 'GRAPHICS · HIGH' : 'GRAPHICS · LOW';
}
