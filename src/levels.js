const UNLOCK_KEY = 'first-shift-unlocked';
const BEST_PREFIX = 'first-shift-best-L';

/** @typedef {'suburb' | 'borough' | 'downtown' | 'oldtown'} LevelMode */

export const LEVELS = [
  {
    id: 1,
    key: 'suburbs',
    name: 'SUBURBS',
    subtitle: 'Estate Lane',
    blurb: 'Quiet cul-de-sacs. Almost empty road. First pedal out.',
    doorLabel: 'HOME',
    debriefPhoto: '/debrief/debrief-suburbs.png',
    debriefReceiver: 'THE RESIDENT',
    debriefQuote:
      'You\'re late in the ways that matter. Leave it on the mat. Don\'t look at the windows on your way out.',
    goal: 620,
    startTime: 68,
    // Quiet lane — one van on the last stretch, zero walkers
    obstacleStart: 470,
    obstacleGapEarly: [80, 40],
    obstacleGapLate: [80, 40],
    traffic: { vanChance: 1, maxVans: 1, maxWalkers: 0 },
    pickupStart: 40,
    pickupGap: [32, 22],
    musicBase: 0.2,
    theme: {
      mode: 'suburb',
      brick: [0x3a342e, 0x443c34, 0x322e28, 0x3c3830],
      neon: [0xffb347, 0xffe0a0, 0x7ec8a3],
      neonChance: 0.22,
      shopChance: 0.35,
      storiesMin: 1,
      storiesMax: 2,
      towerChance: 0.04,
      buildingSpacing: 16,
      denseness: 0.75,
      treeChance: 0.8,
      hedgeChance: 0.85,
      cableChance: 0.08,
      fog: 0x152028,
      fogDensity: 0.011,
      bg: 0x0a141c,
      hemiSky: 0x6a8aaa,
      hemiGround: 0x1a1810,
      fill: 0x4a6a40,
      fillInt: 0.08,
      moonInt: 0.5,
      ambient: 0x5a7460,
      ground: 0x3d6a40,
      road: 0x3a3e48,
      pave: 0x52564c,
      rainOpacity: 0.12,
      bloom: [0.28, 0.28, 0.78],
      skyStops: [
        [0, '#050810'],
        [0.35, '#0c1824'],
        [0.6, '#1a2838'],
        [0.85, '#3a4050'],
        [1, '#6a6870'],
      ],
      skylineDensity: 0.25,
      glowColor: 0x4a6a80,
      warmGlow: 0xffa060,
    },
  },
  {
    id: 2,
    key: 'borough',
    name: 'BOROUGH',
    subtitle: 'Canal Reach',
    blurb: 'Attached terraces. Cars. One walker. GF may call.',
    doorLabel: 'DOOR',
    debriefPhoto: '/debrief/debrief-borough.png',
    debriefReceiver: 'THE SHOPKEEP',
    debriefQuote:
      'We stopped asking what\'s inside. The canal keeps the receipts. Ride quiet — something followed you halfway.',
    goal: 850,
    startTime: 55,
    // Light traffic; exactly one phone-zombie
    obstacleStart: 70,
    obstacleGapEarly: [38, 22],
    obstacleGapLate: [28, 16],
    traffic: { vanChance: 0.92, maxWalkers: 1, maxVans: 7 },
    pickupStart: 45,
    pickupGap: [36, 28],
    musicBase: 0.35,
    theme: {
      mode: 'borough',
      brick: [0x4a3830, 0x3e322c, 0x523c34, 0x443830, 0x383028],
      neon: [0xff9f1c, 0xffb347, 0x5cffb0, 0x3de0ff, 0xff6a3a],
      neonChance: 0.45,
      shopChance: 0.55,
      storiesMin: 2,
      storiesMax: 3,
      towerChance: 0.08,
      buildingSpacing: 9.5,
      denseness: 1,
      treeChance: 0.12,
      hedgeChance: 0.2,
      cableChance: 0.2,
      fog: 0x1a2030,
      fogDensity: 0.013,
      bg: 0x0c1420,
      hemiSky: 0x6a7a9a,
      hemiGround: 0x1a1410,
      fill: 0xff9f1c,
      fillInt: 0.14,
      moonInt: 0.48,
      ambient: 0x4a5a6c,
      ground: 0x141820,
      road: 0x12161c,
      pave: 0x2a2e28,
      rainOpacity: 0.18,
      bloom: [0.32, 0.28, 0.75],
      skyStops: [
        [0, '#040810'],
        [0.25, '#0c1828'],
        [0.5, '#1a2438'],
        [0.75, '#3a4058'],
        [0.9, '#6a5860'],
        [1, '#a08070'],
      ],
      skylineDensity: 0.45,
      glowColor: 0x4a6080,
      warmGlow: 0xff9f1c,
    },
  },
  {
    id: 3,
    key: 'downtown',
    name: 'DOWNTOWN',
    subtitle: 'Neon Mile',
    blurb: 'Glass canyon. Mean clock. Mid-run: boss may call.',
    doorLabel: 'TOWER',
    debriefPhoto: '/debrief/debrief-downtown.png',
    debriefReceiver: 'THE CLIENT',
    debriefQuote:
      'Thank you. The building already knew your name. Please forget the lobby. It will not forget you.',
    goal: 1100,
    startTime: 61,
    obstacleStart: 50,
    obstacleGapEarly: [20, 14],
    obstacleGapLate: [12, 10],
    traffic: { vanChance: 0.5 },
    pickupStart: 35,
    pickupGap: [40, 30],
    musicBase: 0.5,
    theme: {
      mode: 'downtown',
      brick: [0x1a2030, 0x121824, 0x202838, 0x181c28, 0x0e1420],
      neon: [0xff2d6a, 0x3de0ff, 0xb44dff, 0x5cffb0, 0xff0044, 0x00ffe0],
      neonChance: 0.95,
      shopChance: 1,
      storiesMin: 5,
      storiesMax: 10,
      towerChance: 0.9,
      buildingSpacing: 11,
      denseness: 1,
      treeChance: 0,
      hedgeChance: 0,
      cableChance: 0.55,
      fog: 0x100820,
      fogDensity: 0.017,
      bg: 0x060210,
      hemiSky: 0x6a4080,
      hemiGround: 0x100818,
      fill: 0xff2d6a,
      fillInt: 0.28,
      moonInt: 0.3,
      ambient: 0x281838,
      ground: 0x060810,
      road: 0x080a10,
      pave: 0x161820,
      rainOpacity: 0.28,
      bloom: [0.55, 0.38, 0.55],
      skyStops: [
        [0, '#020108'],
        [0.3, '#0a0618'],
        [0.55, '#1a0830'],
        [0.75, '#3a1050'],
        [0.9, '#6a2060'],
        [1, '#a03050'],
      ],
      skylineDensity: 1,
      glowColor: 0xff2d6a,
      warmGlow: 0x3de0ff,
    },
  },
  {
    id: 4,
    key: 'oldtown',
    name: 'OLD TOWN',
    subtitle: 'Bell Lane',
    blurb: 'Gothic stone. Mid-run: unknown number may call.',
    doorLabel: 'GATE',
    debriefPhoto: '/debrief/debrief-oldtown.png',
    debriefReceiver: 'THE WARDEN',
    debriefQuote:
      'The lane remembers every wheel. Leave the parcel at the gate. Do not answer if the bells ring your name.',
    goal: 980,
    startTime: 48,
    obstacleStart: 40,
    // Densest — more of everything than downtown
    obstacleGapEarly: [12, 8],
    obstacleGapLate: [7, 5],
    traffic: { vanChance: 0.42 },
    pickupStart: 38,
    pickupGap: [34, 24],
    musicBase: 0.42,
    theme: {
      mode: 'oldtown',
      brick: [0x2a2620, 0x322e28, 0x241e1a, 0x2e2a24, 0x1e1a16, 0x343028],
      neon: [0xffa050, 0xffb347, 0xe08040, 0xc09060],
      neonChance: 0.15,
      shopChance: 0.25,
      storiesMin: 4,
      storiesMax: 7,
      towerChance: 0.35,
      buildingSpacing: 7.5,
      denseness: 1,
      treeChance: 0,
      hedgeChance: 0,
      cableChance: 0.12,
      fog: 0x141210,
      fogDensity: 0.019,
      bg: 0x080604,
      hemiSky: 0x4a4038,
      hemiGround: 0x100c08,
      fill: 0xffa050,
      fillInt: 0.16,
      moonInt: 0.35,
      ambient: 0x383020,
      ground: 0x12100c,
      road: 0x1a1814,
      pave: 0x2a2620,
      rainOpacity: 0.24,
      bloom: [0.38, 0.3, 0.68],
      skyStops: [
        [0, '#020104'],
        [0.3, '#0a0806'],
        [0.55, '#1a1410'],
        [0.75, '#2a2018'],
        [0.9, '#4a3020'],
        [1, '#6a4030'],
      ],
      skylineDensity: 0.85,
      glowColor: 0x5a4030,
      warmGlow: 0xffa050,
    },
  },
];

export function getLevel(id) {
  return LEVELS.find((l) => l.id === id) || LEVELS[0];
}

export function getUnlocked() {
  const n = Number(localStorage.getItem(UNLOCK_KEY) || 1);
  return Math.min(LEVELS.length, Math.max(1, n));
}

export function unlockThrough(id) {
  const cur = getUnlocked();
  if (id > cur) localStorage.setItem(UNLOCK_KEY, String(Math.min(LEVELS.length, id)));
}

/** Call after beating level `id` → unlocks id+1 */
export function onLevelWon(id) {
  unlockThrough(id + 1);
}

export function getBest(id) {
  return Number(localStorage.getItem(BEST_PREFIX + id) || 0);
}

export function setBest(id, dist) {
  const prev = getBest(id);
  if (dist > prev) {
    localStorage.setItem(BEST_PREFIX + id, String(dist));
    return dist;
  }
  return prev;
}
