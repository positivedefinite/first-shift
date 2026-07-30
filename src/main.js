import * as THREE from 'three/webgpu';
import { pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { createWorld } from './world.js';
import { createPlayer } from './player.js';
import { createRain } from './rain.js';
import { createMinimap } from './minimap.js';
import { createMusic } from './music.js';
import {
  LEVELS,
  getLevel,
  getUnlocked,
  onLevelWon,
  getBest,
  setBest,
} from './levels.js';
import { VERSION } from './version.js';

const els = {
  version: document.getElementById('version'),
  menuVersion: document.getElementById('menuVersion'),
  endVersion: document.getElementById('endVersion'),
  fps: document.getElementById('fps'),
  tunnel: document.getElementById('tunnel'),
  blood: document.getElementById('blood'),
  thought: document.getElementById('thought'),
  overlay: document.getElementById('overlay'),
  end: document.getElementById('end'),
  endEyebrow: document.getElementById('endEyebrow'),
  endTitle: document.getElementById('endTitle'),
  endLead: document.getElementById('endLead'),
  debrief: document.getElementById('debrief'),
  debriefImg: document.getElementById('debriefImg'),
  debriefStamp: document.getElementById('debriefStamp'),
  debriefLine: document.getElementById('debriefLine'),
  debriefWho: document.getElementById('debriefWho'),
  debriefMeta: document.getElementById('debriefMeta'),
  startBtn: document.getElementById('startBtn'),
  retryBtn: document.getElementById('retryBtn'),
  nextBtn: document.getElementById('nextBtn'),
  mapBtn: document.getElementById('mapBtn'),
  levelGrid: document.getElementById('levelGrid'),
  hud: document.getElementById('hud'),
  clock: document.getElementById('clock'),
  progress: document.getElementById('progress'),
  dist: document.getElementById('dist'),
  status: document.getElementById('status'),
  best: document.getElementById('best'),
  levelTag: document.getElementById('levelTag'),
  minimap: document.getElementById('minimap'),
  toast: document.getElementById('toast'),
  fx: document.getElementById('fx'),
  meter: document.querySelector('.meter'),
  speedFill: document.getElementById('speedFill'),
  speedLabel: document.getElementById('speedLabel'),
  speedMeter: document.querySelector('.speed-meter'),
  minimapWrap: document.getElementById('minimap-wrap'),
  phoneCall: document.getElementById('phoneCall'),
  phoneText: document.getElementById('phoneText'),
  callStatus: document.getElementById('callStatus'),
  callActions: document.getElementById('callActions'),
  callAccept: document.getElementById('callAccept'),
  callDismiss: document.getElementById('callDismiss'),
  callAvatar: document.getElementById('callAvatar'),
  callName: document.getElementById('callName'),
  textFrom: document.getElementById('textFrom'),
  textBody: document.getElementById('textBody'),
};

const verLabel = `v${VERSION}`;
if (els.version) els.version.textContent = verLabel;
if (els.menuVersion) els.menuVersion.textContent = verLabel;
if (els.endVersion) els.endVersion.textContent = verLabel;

/** Mid-run callers — keyed by level.key */
const CALLERS = {
  borough: {
    id: 'gf',
    short: 'GF',
    name: 'girlfriend',
    statusWho: 'GF',
    voice: 'normal',
    callAt: 0.5,
    thought: "She loves me, but she's too much at times...",
    texts: [
      'ok cool. ignore me then.',
      'wow. the bike. fine.',
      "don't bother texting back.",
      'saw you were online. cute.',
      'deliver your ego first.',
    ],
  },
  downtown: {
    id: 'boss',
    short: 'BOSS',
    name: 'boss',
    statusWho: 'BOSS',
    voice: 'boss',
    callAt: 0.5,
    thought: 'This fatass obviously never rode a bike...',
    texts: [
      'Answer next time. Clock is watching.',
      'That parcel pays your rent. Priorities.',
      'HR called it "availability." I call it fired.',
      'Client waited. You pedaled. Notes taken.',
      'Missed call = missed shift. Think.',
    ],
  },
  oldtown: {
    id: 'unknown',
    short: '???',
    name: 'unknown number',
    statusWho: 'UNKNOWN',
    voice: 'weird',
    callAt: 0.3,
    thought: "can't make any sense of what he's saying, something about going back?",
    texts: [
      'still time to turn back.',
      'turn around. there is still time.',
      'the span waits. go back while you can.',
      'you can still reverse. do it.',
    ],
  },
};

/** Incoming call — borough GF / downtown boss / oldtown unknown */
const call = {
  phase: 'idle', // idle | ring | talk | sulk | text | done
  timer: 0,
  fired: false,
  who: null,
};

/** Old Town mid-late boss SMS (+time) — separate from unknown call */
const bossPing = { fired: false };

let thoughtTimer = 0;

const HIT_THOUGHTS = [
  'ugh',
  'arrr',
  '!@#%&!!!',
  'ow—',
  'come on',
  'seriously?!',
  'not now',
  'aaagh',
  '$#@!',
  'watch it!',
];

function showThought(line, dur = 4.2) {
  if (!els.thought || !line) return;
  els.thought.textContent = line;
  els.thought.classList.add('on');
  thoughtTimer = dur;
}

function showHitThought() {
  const line = HIT_THOUGHTS[Math.floor(Math.random() * HIT_THOUGHTS.length)];
  showThought(line, 1.35);
}

function clearThought() {
  thoughtTimer = 0;
  els.thought?.classList.remove('on');
  if (els.thought) els.thought.textContent = '';
}

function updateThought(dt) {
  if (thoughtTimer <= 0) return;
  thoughtTimer -= dt;
  if (thoughtTimer <= 0) clearThought();
}

function callerForLevel(lv) {
  return CALLERS[lv.key] || null;
}

function applyCallerSkin(who) {
  const boss = who?.id === 'boss';
  const unknown = who?.id === 'unknown';
  els.callAvatar.textContent = who.short;
  els.callAvatar.classList.toggle('boss', boss);
  els.callAvatar.classList.toggle('unknown', unknown);
  els.callName.textContent = who.name;
  els.phoneCall.classList.toggle('boss-call', boss);
  els.phoneCall.classList.toggle('unknown-call', unknown);
  els.phoneText.classList.toggle('boss-text', boss);
  els.phoneText.classList.toggle('unknown-text', unknown);
  els.textFrom.textContent = who.short;
}

function resetCall() {
  call.phase = 'idle';
  call.timer = 0;
  call.fired = false;
  call.who = null;
  bossPing.fired = false;
  player.onCall = false;
  music.stopRingtone();
  music.stopTalk();
  clearThought();
  hitTunnelT = 0;
  els.tunnel?.classList.remove('on');
  els.minimapWrap?.classList.remove('phone-busy');
  els.phoneCall?.classList.add('hidden');
  els.phoneCall?.classList.remove('ringing', 'boss-call', 'unknown-call');
  els.phoneText?.classList.add('hidden');
  els.phoneText?.classList.remove('boss-text', 'unknown-text');
  els.callActions?.classList.remove('hidden');
  els.callAvatar?.classList.remove('boss', 'unknown');
  if (els.callStatus) els.callStatus.textContent = 'incoming call…';
}

function beginRing(who) {
  call.phase = 'ring';
  call.timer = 12; // ignore long enough → treat as dismiss
  call.fired = true;
  call.who = who;
  applyCallerSkin(who);
  els.minimapWrap.classList.add('phone-busy');
  els.phoneCall.classList.remove('hidden');
  els.phoneCall.classList.add('ringing');
  els.phoneText.classList.add('hidden');
  els.callActions.classList.remove('hidden');
  els.callStatus.textContent = 'incoming call…';
  els.status.textContent = `${who.statusWho} calling — pick up or dismiss`;
  music.startRingtone();
}

function acceptCall() {
  if (call.phase !== 'ring') return;
  call.phase = 'talk';
  call.timer = 4.2;
  player.onCall = true;
  els.phoneCall.classList.remove('ringing');
  els.callActions.classList.add('hidden');
  const weird = call.who?.voice === 'weird';
  els.callStatus.textContent = weird ? '………' : 'on call…';
  els.status.textContent = weird
    ? 'something on the line…'
    : 'on the phone — slow down';
  music.stopRingtone();
  music.startTalk(call.who?.voice || 'normal');
  els.tunnel?.classList.add('on');
  if (call.who?.thought) showThought(call.who.thought, 4.5);
}

function dismissCall() {
  if (call.phase !== 'ring') return;
  call.phase = 'sulk';
  call.timer = 3;
  els.phoneCall.classList.add('hidden');
  els.phoneCall.classList.remove('ringing');
  els.minimapWrap.classList.remove('phone-busy');
  els.status.textContent = 'dismissed — …';
  music.stopRingtone();
}

function showAngryText() {
  call.phase = 'text';
  call.timer = 4;
  const who = call.who;
  const texts = who?.texts || ['…'];
  const line = texts[Math.floor(Math.random() * texts.length)];
  els.textBody.textContent = line;
  els.textFrom.textContent = who?.short || '?';
  els.phoneText.classList.toggle('boss-text', who?.id === 'boss');
  els.phoneText.classList.toggle('unknown-text', who?.id === 'unknown');
  els.minimapWrap.classList.add('phone-busy');
  els.phoneText.classList.remove('hidden');
  els.phoneCall.classList.add('hidden');
  els.status.textContent = `new message — ${who?.statusWho || '??'}`;
  music.textBlip();
}

/** Old Town — boss SMS at 75%, grants +15s */
function showBossTimeText() {
  els.textFrom.textContent = 'BOSS';
  els.textBody.textContent = "client called, there's still time!";
  els.phoneText.classList.add('boss-text');
  els.phoneText.classList.remove('unknown-text');
  els.minimapWrap.classList.add('phone-busy');
  els.phoneText.classList.remove('hidden');
  els.phoneCall.classList.add('hidden');
  els.status.textContent = 'new message — BOSS · +15s';
  state.time += 15;
  music.textBlip();
  pulseEvent('tip');
  // Reuse text phase so it auto-clears
  call.phase = 'text';
  call.timer = 4.5;
  call.who = CALLERS.downtown;
}

function endCallUi() {
  call.phase = 'done';
  call.timer = 0;
  player.onCall = false;
  music.stopTalk();
  music.stopRingtone();
  // Keep shade if a recent bump still owns it
  if (hitTunnelT <= 0) els.tunnel?.classList.remove('on');
  els.minimapWrap.classList.remove('phone-busy');
  els.phoneCall.classList.add('hidden');
  els.phoneCall.classList.remove('ringing');
  els.phoneText.classList.add('hidden');
  els.callActions.classList.remove('hidden');
}

function updateCall(dt) {
  if (state.mode !== 'play') return;

  updateThought(dt);

  const who = callerForLevel(level);
  const callAt = who?.callAt ?? 0.5;
  if (!call.fired && who && state.distance >= level.goal * callAt) {
    beginRing(who);
  }

  // Old Town: boss ping at 75% once the unknown call is clear
  if (
    level.key === 'oldtown' &&
    !bossPing.fired &&
    state.distance >= level.goal * 0.75 &&
    (call.phase === 'idle' || call.phase === 'done')
  ) {
    bossPing.fired = true;
    showBossTimeText();
  }

  if (call.phase === 'idle' || call.phase === 'done') return;

  call.timer -= dt;
  if (call.phase === 'ring') {
    if (call.timer <= 0) dismissCall();
  } else if (call.phase === 'talk') {
    const weird = call.who?.voice === 'weird';
    els.callStatus.textContent = weird
      ? `${'…'.repeat(1 + Math.floor((4.2 - call.timer) * 2))}`
      : `on call… ${Math.ceil(Math.max(0, call.timer))}s`;
    if (call.timer <= 0) {
      endCallUi();
      els.status.textContent = weird
        ? 'line dead — keep riding'
        : 'call ended — eyes on the road';
    }
  } else if (call.phase === 'sulk') {
    if (call.timer <= 0) showAngryText();
  } else if (call.phase === 'text') {
    if (call.timer <= 0) endCallUi();
  }
}

/** Peak possible speed (boost × handling) — meter full scale */
const SPEED_CEIL = 26 * 1.38;

let clockBumpTimer = 0;
let bloomKick = 0;
/** Hit tunnel-vision leftover — don't clear if phone talk still owns the shade */
let hitTunnelT = 0;
const slip = { active: false, t: 0 };

function flashHitTunnel() {
  hitTunnelT = 1.15;
  els.tunnel?.classList.add('on');
}

function updateHitTunnel(dt) {
  if (hitTunnelT <= 0) return;
  hitTunnelT = Math.max(0, hitTunnelT - dt);
  if (hitTunnelT <= 0 && call.phase !== 'talk' && !slip.active) {
    els.tunnel?.classList.remove('on');
  }
}

function beginSlip() {
  if (slip.active || state.mode !== 'play') return;
  slip.active = true;
  slip.t = 0;
  state.mode = 'slip';
  resetCall();
  player.startTumble();
  music.stop(false);
  music.boneCrack();
  els.hud.classList.remove('live');
  els.tunnel?.classList.add('on');
  els.blood?.classList.add('on');
  els.status.textContent = '—';
  state.shake = 1.2;
}

function showFinale() {
  slip.active = false;
  state.mode = 'win';
  const score = state.distance;
  const best = setBest(level.id, score);
  onLevelWon(level.id);

  els.blood?.classList.remove('on');
  els.tunnel?.classList.remove('on');
  els.end.classList.remove('hidden');
  els.end.classList.add('win-debrief', 'finale');
  els.debrief.classList.remove('hidden');
  els.endEyebrow.textContent = 'end of the road';
  els.endTitle.textContent = 'THIS NIGHT';
  els.endLead.textContent = 'did not go as you planned.';

  els.debriefImg.src = level.debriefPhoto;
  els.debriefImg.alt = 'Aftermath still';
  els.debriefStamp.textContent = `STILL · ${level.name} · ${Math.floor(score)}m`;
  els.debriefLine.textContent = `“${level.debriefQuote}”`;
  els.debriefWho.textContent = '— the span';
  els.debriefMeta.textContent = 'no next district · the moon kept rising without you';

  els.nextBtn.classList.add('hidden', 'ghost');
  els.retryBtn.classList.remove('ghost');
  els.retryBtn.textContent = 'RIDE AGAIN';
  els.best.textContent = best > 0 ? `best ${Math.floor(best)}m` : '';
}

function updateSlip(dt) {
  if (!slip.active) return;
  slip.t += dt;
  player.update(dt, { steer: 0, throttle: 0, boost: false });
  world.update(0, player, state.distance, clock.elapsedTime);
  state.shake = Math.max(0.3, 1.4 - slip.t * 0.35);
  if (renderer) {
    renderer.toneMappingExposure = Math.max(0.22, 1.05 - slip.t * 0.28);
  }
  bloomPass.strength.value = 0.15;
  updateCamera(dt);
  if (slip.t > 0.35 && slip.t < 0.4) music.boneCrack();
  if (slip.t > 2.9) showFinale();
}

function pulseEvent(kind) {
  // kind: 'tip' | 'hit' — SFX + light HUD, no center toast
  const isTip = kind === 'tip';
  if (els.toast) els.toast.className = 'toast';

  els.fx.className = `fx ${kind}`;
  void els.fx.offsetWidth;
  els.fx.className = `fx ${kind}`;

  els.clock.classList.remove('tip-bump', 'hit-bump');
  void els.clock.offsetWidth;
  els.clock.classList.add(isTip ? 'tip-bump' : 'hit-bump');
  clockBumpTimer = 0.55;

  els.meter?.classList.remove('tip-glow', 'hit-glow');
  void els.meter?.offsetWidth;
  els.meter?.classList.add(isTip ? 'tip-glow' : 'hit-glow');

  bloomKick = isTip ? 0.55 : 0.75;
  if (renderer) renderer.toneMappingExposure = isTip ? 1.35 : 0.72;

  if (isTip) music.pickup();
  else music.hit();
}

const keys = new Set();
addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
});
addEventListener('keyup', (e) => keys.delete(e.code));

const pointer = { x: 0, active: false, boost: false };
let inputLock = 0; // seconds — ignore pointer after UI clicks (PUNCH IN etc.)

function isUiTarget(t) {
  return !!(
    t &&
    t.closest &&
    t.closest('button, a, input, .panel, .level-card, .level-grid, .phone-call, .phone-text')
  );
}

function clearPointer() {
  pointer.active = false;
  pointer.boost = false;
  pointer.x = 0;
}

addEventListener('pointerdown', (e) => {
  // Clicking PUNCH IN / cards must NOT count as steer input
  if (isUiTarget(e.target) || state.mode !== 'play' || inputLock > 0) {
    clearPointer();
    return;
  }
  pointer.active = true;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  if (e.clientY < innerHeight * 0.35) pointer.boost = true;
});
addEventListener('pointermove', (e) => {
  if (!pointer.active || inputLock > 0) return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
});
addEventListener('pointerup', clearPointer);
addEventListener('pointercancel', clearPointer);
// Click on PUNCH IN can leave a stuck button after overlay hides
addEventListener('pointerleave', clearPointer);
addEventListener('blur', () => {
  clearPointer();
  keys.clear();
});

let selectedLevelId = Math.min(getUnlocked(), LEVELS.length);
let level = getLevel(selectedLevelId);

const state = {
  mode: 'title', // title | play | win | lose
  time: level.startTime,
  distance: 0,
  shake: 0,
  flash: 0,
};

const clock = new THREE.Clock();
const scene = new THREE.Scene();
scene.background = new THREE.Color(level.theme.bg);
scene.fog = new THREE.FogExp2(level.theme.fog, level.theme.fogDensity);

const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 220);
camera.position.set(0, 2.6, 4.2);

const hemi = new THREE.HemisphereLight(level.theme.hemiSky, level.theme.hemiGround, 0.7);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0xa8b8d8, level.theme.moonInt);
moon.position.set(-18, 40, 8);
scene.add(moon);

const fill = new THREE.DirectionalLight(level.theme.fill, level.theme.fillInt);
fill.position.set(10, 8, -5);
scene.add(fill);

const streetFill = new THREE.AmbientLight(level.theme.ambient, 0.25);
scene.add(streetFill);

const world = createWorld(scene);
const player = createPlayer(scene);
const rain = createRain(scene);
rain.setOpacity(level.theme.rainOpacity);

const renderer = new THREE.WebGPURenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.domElement.id = 'view';
document.body.prepend(renderer.domElement);

const minimap = createMinimap(els.minimap);
const music = createMusic();

const renderPipeline = new THREE.RenderPipeline(renderer);
const scenePass = pass(scene, camera);
const sceneColor = scenePass.getTextureNode('output');
let bloomPass = bloom(
  sceneColor,
  level.theme.bloom[0],
  level.theme.bloom[1],
  level.theme.bloom[2],
);
renderPipeline.outputNode = sceneColor.add(bloomPass);

function applyAtmosphere(lv) {
  scene.background.setHex(lv.theme.bg);
  scene.fog.color.setHex(lv.theme.fog);
  scene.fog.density = lv.theme.fogDensity;
  hemi.color.setHex(lv.theme.hemiSky);
  hemi.groundColor.setHex(lv.theme.hemiGround);
  moon.intensity = lv.theme.moonInt;
  fill.color.setHex(lv.theme.fill);
  fill.intensity = lv.theme.fillInt;
  streetFill.color.setHex(lv.theme.ambient);
  rain.setOpacity(lv.theme.rainOpacity);
  bloomPass.strength.value = lv.theme.bloom[0];
  bloomPass.radius.value = lv.theme.bloom[1];
  bloomPass.threshold.value = lv.theme.bloom[2];
  music.setDistrict(lv.theme.mode);
}

function fitCardNames() {
  for (const name of els.levelGrid.querySelectorAll('.name')) {
    name.style.fontSize = '';
    const maxPx = 17;
    const minPx = 11;
    let size = maxPx;
    name.style.fontSize = `${size}px`;
    // Shrink until the title sits on one line inside the card
    while (name.scrollWidth > name.clientWidth + 0.5 && size > minPx) {
      size -= 0.5;
      name.style.fontSize = `${size}px`;
    }
  }
}

function renderLevelGrid() {
  const unlocked = getUnlocked();
  els.levelGrid.innerHTML = '';
  for (const lv of LEVELS) {
    const locked = lv.id > unlocked;
    const best = getBest(lv.id);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-card' + (lv.id === selectedLevelId && !locked ? ' selected' : '');
    btn.disabled = locked;
    btn.innerHTML = `
      <div class="lv">LEVEL ${lv.id}</div>
      <div class="name">${lv.name}</div>
      <div class="sub">${lv.subtitle}</div>
      <div class="meta">${lv.blurb}${best > 0 ? `<br />best ${Math.floor(best)}m` : ''}</div>
      ${locked ? '<div class="lock">locked — beat previous</div>' : ''}
    `;
    if (!locked) {
      btn.addEventListener('click', () => {
        selectedLevelId = lv.id;
        level = getLevel(selectedLevelId);
        renderLevelGrid();
        // Preview theme on title
        world.setLevel(level);
        applyAtmosphere(level);
      });
    }
    els.levelGrid.appendChild(btn);
  }
  // Layout must settle before measuring overflow
  requestAnimationFrame(() => requestAnimationFrame(fitCardNames));
}

function showMap() {
  slip.active = false;
  els.blood?.classList.remove('on');
  els.tunnel?.classList.remove('on');
  els.end.classList.remove('finale');
  state.mode = 'title';
  resetCall();
  els.end.classList.add('hidden');
  els.end.classList.remove('win-debrief');
  els.debrief.classList.add('hidden');
  els.overlay.classList.remove('hidden');
  els.hud.classList.remove('live');
  music.stop(true);
  renderLevelGrid();
  world.setLevel(getLevel(selectedLevelId));
  applyAtmosphere(getLevel(selectedLevelId));
}

function startLevel(id) {
  selectedLevelId = id;
  level = getLevel(id);
  world.setLevel(level);
  applyAtmosphere(level);
  resetCall();

  state.mode = 'play';
  state.time = level.startTime;
  state.distance = 0;
  state.shake = 0;
  state.flash = 0;
  // Kill leftover touch/mouse steer from the PUNCH IN click (or release outside window)
  clearPointer();
  keys.clear();
  inputLock = 0.65;

  player.reset();
  // Title cam sways on X — snap to spawn lane (right side)
  const sx = player.startX ?? 1.85;
  camera.position.set(sx * 0.72, 2.4, 3.8);
  camera.lookAt(sx * 0.85, 1.2, -7);
  state.shake = 0;

  slip.active = false;
  els.blood?.classList.remove('on');
  els.tunnel?.classList.remove('on');
  els.overlay.classList.add('hidden');
  els.end.classList.add('hidden');
  els.end.classList.remove('win-debrief', 'finale');
  els.debrief.classList.add('hidden');
  els.nextBtn.classList.add('hidden');
  els.retryBtn.textContent = 'TRY AGAIN';
  els.hud.classList.add('live');
  els.levelTag.textContent = `L${level.id} · ${level.name}`;
  els.status.textContent = level.finale
    ? 'clear sky · hold W · the city is behind you'
    : 'hold W to pedal · coast = stop · M mute';
  els.clock.classList.remove('urgent');
  const best = getBest(level.id);
  els.best.textContent = best > 0 ? `best ${Math.floor(best)}m` : '';
  music.setDistrict(level.theme.mode);
  music.start();
  if (renderer) renderer.toneMappingExposure = 1.05;
}

function endRun(won) {
  resetCall();
  state.mode = won ? 'win' : 'lose';
  els.hud.classList.remove('live');
  els.end.classList.remove('hidden');

  const score = state.distance;
  const best = setBest(level.id, score);

  if (won) {
    music.winSting();
    music.stop(true);
    onLevelWon(level.id);
    const hasNext = level.id < LEVELS.length;

    els.end.classList.add('win-debrief');
    els.end.classList.remove('finale');
    els.debrief.classList.remove('hidden');
    els.endEyebrow.textContent = 'delivery logged';
    els.endTitle.textContent = level.subtitle.toUpperCase();
    els.endLead.textContent = '';

    els.debriefImg.src = level.debriefPhoto;
    els.debriefImg.alt = `Delivery still — ${level.subtitle}`;
    els.debriefStamp.textContent = `STILL · ${level.name} · ${Math.floor(score)}m`;
    els.debriefLine.textContent = `“${level.debriefQuote}”`;
    els.debriefWho.textContent = `— ${level.debriefReceiver}`;
    els.debriefMeta.textContent = hasNext
      ? `${state.time.toFixed(1)}s left on the clock · next district unlocked`
      : `${state.time.toFixed(1)}s left · the city has your route now`;

    if (hasNext) {
      els.nextBtn.classList.remove('hidden', 'ghost');
      els.nextBtn.textContent = `NEXT · ${getLevel(level.id + 1).name}`;
      els.retryBtn.classList.add('ghost');
    } else {
      els.nextBtn.classList.add('hidden');
      els.nextBtn.classList.add('ghost');
      els.retryBtn.classList.remove('ghost');
    }
    els.retryBtn.textContent = 'RIDE AGAIN';
  } else {
    music.loseSting();
    music.stop(true);
    els.end.classList.remove('win-debrief', 'finale');
    els.debrief.classList.add('hidden');
    els.endEyebrow.textContent = 'clock wins';
    els.endTitle.textContent = 'LATE';
    els.endLead.innerHTML = `${level.subtitle} waits.<br />You got ${Math.floor(score)}m · best ${Math.floor(best)}m`;
    els.nextBtn.classList.add('hidden', 'ghost');
    els.retryBtn.classList.remove('ghost');
    els.retryBtn.textContent = 'TRY AGAIN';
  }
  els.best.textContent = best > 0 ? `best ${Math.floor(best)}m` : '';
}

els.startBtn.addEventListener('click', () => startLevel(selectedLevelId));
els.retryBtn.addEventListener('click', () => startLevel(level.id));
els.nextBtn.addEventListener('click', () => {
  const next = Math.min(level.id + 1, LEVELS.length);
  if (next <= getUnlocked()) startLevel(next);
});
els.mapBtn.addEventListener('click', showMap);
els.callAccept?.addEventListener('click', (e) => {
  e.stopPropagation();
  acceptCall();
});
els.callDismiss?.addEventListener('click', (e) => {
  e.stopPropagation();
  dismissCall();
});

addEventListener('keydown', (e) => {
  if (e.code === 'Enter' || e.code === 'Space') {
    if (state.mode === 'title' && e.code === 'Enter') startLevel(selectedLevelId);
    else if (state.mode === 'lose') startLevel(level.id);
    else if (state.mode === 'win') {
      if (level.id < LEVELS.length && level.id + 1 <= getUnlocked()) startLevel(level.id + 1);
      else showMap();
    }
  }
  if (e.code === 'KeyM') {
    const muted = music.toggleMute();
    if (muted) {
      music.stopRingtone();
      music.stopTalk();
    }
    if (state.mode === 'play') {
      els.status.textContent = muted ? 'muted' : 'hold W to pedal · coast = stop · M mute';
    }
  }
  if (state.mode === 'play' && call.phase === 'ring') {
    if (e.code === 'KeyY' || e.code === 'Enter') acceptCall();
    if (e.code === 'KeyN' || e.code === 'Escape' || e.code === 'Backspace') dismissCall();
  }
  if (
    state.mode === 'title' &&
    (e.code === 'Digit1' ||
      e.code === 'Digit2' ||
      e.code === 'Digit3' ||
      e.code === 'Digit4' ||
      e.code === 'Digit5')
  ) {
    const id = Number(e.code.replace('Digit', ''));
    if (id <= getUnlocked()) {
      selectedLevelId = id;
      level = getLevel(id);
      renderLevelGrid();
      world.setLevel(level);
      applyAtmosphere(level);
    }
  }
});

function readInput() {
  let steer = 0;
  let throttle = 0;
  let boost = false;

  // Spawn grace — no lateral input (click / held key / title sway aftermath)
  if (inputLock > 0) {
    if (keys.has('KeyW') || keys.has('ArrowUp')) throttle = 1;
    return { steer: 0, throttle, boost: false };
  }

  if (keys.has('KeyA') || keys.has('ArrowLeft')) steer -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) steer += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) throttle = 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) throttle = -0.35;
  if (keys.has('Space') || keys.has('ShiftLeft') || keys.has('ShiftRight')) boost = true;

  // Pointer only after UI grace — else PUNCH IN click yanks bike sideways
  if (pointer.active) {
    steer = THREE.MathUtils.clamp(pointer.x * 1.4, -1, 1);
    throttle = 1;
    if (pointer.boost) boost = true;
  }

  return { steer, throttle, boost };
}

function formatTime(t) {
  const s = Math.max(0, t);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}

function updateHud() {
  els.clock.textContent = formatTime(state.time);
  els.clock.classList.toggle('urgent', state.time < 12);
  const p = Math.min(1, state.distance / level.goal);
  els.progress.style.width = `${p * 100}%`;
  els.dist.textContent = `${Math.floor(state.distance)}m`;

  const hMult = player.handlingMult();
  const spd = player.speed;
  const fill = Math.min(1, spd / SPEED_CEIL);
  if (els.speedFill) els.speedFill.style.width = `${fill * 100}%`;
  if (els.speedMeter) els.speedMeter.classList.toggle('hot', hMult > 1.02);
  if (els.speedLabel) {
    els.speedLabel.textContent = player.stalled
      ? 'STALL'
      : player.onCall
        ? 'CALL'
        : 'SPEED';
  }

  const radar = world.getRadar();
  minimap.draw({
    playerX: player.group.position.x,
    stalled: player.stalled,
    distance: state.distance,
    goal: level.goal,
    obstacles: radar.obstacles,
    pickups: radar.pickups,
    time: clock.elapsedTime,
    doorLabel: level.doorLabel,
  });
}

function updateCamera(dt) {
  const target = player.group.position;
  const lookAhead = player.speed * 0.06;
  const desired = new THREE.Vector3(
    target.x * 0.72,
    2.35 + player.speed * 0.015,
    target.z + 3.8,
  );

  camera.position.lerp(desired, 1 - Math.exp(-7 * dt));

  if (state.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * state.shake;
    camera.position.y += (Math.random() - 0.5) * state.shake * 0.5;
    state.shake = Math.max(0, state.shake - dt * 4);
  }

  camera.lookAt(target.x * 0.85, 1.25, target.z - 7 - lookAhead);
}

function resize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}
addEventListener('resize', () => {
  resize();
  if (state.mode === 'title') fitCardNames();
});

renderLevelGrid();
world.setLevel(level);
applyAtmosphere(level);

let fpsFrames = 0;
let fpsAcc = 0;
let fpsSmooth = 60;

function updateFps(dt) {
  if (!els.fps || dt <= 0) return;
  fpsFrames += 1;
  fpsAcc += dt;
  if (fpsAcc < 0.25) return;
  const instant = fpsFrames / fpsAcc;
  fpsSmooth = fpsSmooth * 0.65 + instant * 0.35;
  fpsFrames = 0;
  fpsAcc = 0;
  const n = Math.round(fpsSmooth);
  els.fps.textContent = `${n} FPS`;
  els.fps.classList.remove('bad', 'warn', 'ok');
  els.fps.classList.add(n < 10 ? 'bad' : n <= 30 ? 'warn' : 'ok');
}

async function init() {
  await renderer.init();

  renderer.setAnimationLoop(() => {
    const rawDt = clock.getDelta();
    updateFps(rawDt);
    const dt = Math.min(rawDt, 0.05);

    if (state.mode === 'slip') {
      updateSlip(dt);
    } else if (state.mode === 'play') {
      if (inputLock > 0) inputLock = Math.max(0, inputLock - dt);
      const input = readInput();
      const result = player.update(dt, input);
      // Nail centerline during spawn grace (vx can't accumulate)
      if (inputLock > 0) {
        player.vx = 0;
        player.setX(player.startX ?? 1.85);
      }

      state.distance += result.forward * dt;
      state.time -= dt;

      if (result.boosting) state.time -= dt * 0.15;

      if (result.stalled) {
        els.status.textContent = 'stalled — hold W to push off';
      }

      // Always real dt — vans/walkers keep moving when you stall (scroll uses player.speed)
      const hit = world.update(dt, player, state.distance, clock.elapsedTime);

      if (!result.stalled && hit && hit.type === 'crash') {
        state.shake = 0.85 + Math.min(0.4, (hit.bumps - 1) * 0.15);
        player.punish();
        flashHitTunnel();
        showHitThought();
        const n = player.scrapes;
        const tax = Math.round((1 - player.scrapeMult()) * 100);
        els.status.textContent =
          n > 1
            ? `SCRAPE ×${n} — slower (−${tax}% top speed)`
            : `HIT — slowed · keep pedaling`;
        pulseEvent('hit');
      } else if (!result.stalled && hit === 'pickup') {
        player.goodHandling();
        state.shake = 0.12;
        els.status.textContent = 'GOOD HANDLING — feel the grip';
        pulseEvent('tip');
      }

      updateCall(dt);
      updateHitTunnel(dt);

      rain.update(dt, player.group.position, player.speed);
      updateCamera(dt);
      updateHud();
      music.setIntensity(
        result.stalled || player.onCall
          ? 0.12
          : level.musicBase + (player.speed / 38) * 0.55,
      );

      if (clockBumpTimer > 0) {
        clockBumpTimer -= dt;
        if (clockBumpTimer <= 0) {
          els.clock.classList.remove('tip-bump', 'hit-bump');
          els.meter?.classList.remove('tip-glow', 'hit-glow');
        }
      }
      if (bloomKick > 0) {
        bloomKick = Math.max(0, bloomKick - dt * 2.2);
        const [baseS] = level.theme.bloom;
        bloomPass.strength.value = baseS + bloomKick;
        renderer.toneMappingExposure = THREE.MathUtils.damp(
          renderer.toneMappingExposure,
          1.05,
          6,
          dt,
        );
      } else {
        bloomPass.strength.value = level.theme.bloom[0];
      }

      if (level.finale && state.distance >= (level.slipAt ?? level.goal)) {
        beginSlip();
      } else if (!level.finale && state.distance >= level.goal) {
        endRun(true);
      } else if (state.time <= 0) {
        endRun(false);
      }
    } else if (state.mode !== 'slip') {
      world.update(dt * 0.25, player, state.distance, clock.elapsedTime);
      rain.update(dt, player.group.position, 4);
      const sway = Math.sin(clock.elapsedTime * 0.35) * 0.55;
      camera.position.set(sway, 2.4, 3.6);
      camera.lookAt(player.group.position.x * 0.4, 1.1, player.group.position.z - 5);
      // Title: skip bloom cost — night still reads from emissives
      bloomPass.strength.value = 0;
    }

    world.pulse(clock.elapsedTime);
    renderPipeline.render();
  });
}

init().catch((err) => {
  console.error(err);
  els.overlay.querySelector('.lead').textContent =
    'WebGPU/WebGL failed to start. Use a recent Chrome/Firefox/Safari.';
});
