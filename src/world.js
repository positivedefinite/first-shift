import * as THREE from 'three/webgpu';
import { createSky } from './sky.js';
import { LEVELS } from './levels.js';

const SEGMENT = 24;
const SEGMENTS = 14;
const ROAD_W = 7.6;

function brickMat(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.86,
    metalness: 0.06,
  });
}

function neonMat(color, intensity = 2.8) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.15,
  });
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function windowLit(theme, warmBias = 0.7) {
  const on = Math.random() > 0.22;
  if (!on) {
    return new THREE.MeshStandardMaterial({
      color: 0x12151e,
      roughness: 0.4,
      metalness: 0.45,
    });
  }
  const warm = Math.random() < warmBias;
  const color = warm ? 0xffc978 : pick(theme.neon);
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: warm ? 0.85 + Math.random() * 1.2 : 1.4 + Math.random() * 1.6,
    roughness: 0.35,
  });
}

function buildSuburbHouse(side, theme) {
  const g = new THREE.Group();
  const stories = theme.storiesMin + Math.floor(Math.random() * (theme.storiesMax - theme.storiesMin + 1));
  const h = 3.2 + stories * 2.2;
  const depthZ = 6 + Math.random() * 3;
  const depthX = 4 + Math.random() * 2;
  const brick = pick(theme.brick);

  const body = new THREE.Mesh(new THREE.BoxGeometry(depthX, h, depthZ), brickMat(brick));
  body.position.y = h / 2;
  g.add(body);

  // Pitched roof wedge
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(depthX * 0.75, 1.4, 4),
    brickMat(0x2a2420),
  );
  roof.rotation.y = Math.PI / 4;
  roof.position.y = h + 0.6;
  g.add(roof);

  const faceX = side * -(depthX / 2 + 0.02);

  // Porch light
  const porch = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 6, 6),
    neonMat(0xffe0a0, 2.2),
  );
  porch.position.set(faceX - side * 0.3, 2.2, 0);
  g.add(porch);

  // Windows
  for (let story = 0; story < stories; story++) {
    const y = 1.6 + story * 2.2;
    for (const z of [-depthZ * 0.22, depthZ * 0.22]) {
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.9, 0.7),
        windowLit(theme, 0.9),
      );
      pane.position.set(faceX - side * 0.04, y, z);
      g.add(pane);
    }
  }

  // Occasional corner shop
  if (Math.random() < theme.shopChance) {
    const neonColor = pick(theme.neon);
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.3, depthZ * 0.4),
      neonMat(neonColor, 2.4),
    );
    sign.position.set(faceX - side * 0.1, 2.9, 0);
    g.add(sign);
  }

  g.userData.depthX = depthX;
  g.userData.depthZ = depthZ;
  g.userData.height = h;
  return g;
}

/** Attached terrace / row house — shared party walls, pitched roof, low rise */
function buildTerraceHouse(side, theme) {
  const g = new THREE.Group();
  const stories = theme.storiesMin + Math.floor(Math.random() * (theme.storiesMax - theme.storiesMin + 1));
  const storyH = 2.35;
  const h = 2.8 + stories * storyH;
  // Flush along street so neighbours read as one terrace
  const depthZ = (theme.buildingSpacing ?? 10) * (0.92 + Math.random() * 0.06);
  const depthX = 4.2 + Math.random() * 1.2;
  const brick = pick(theme.brick);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(depthX, h, depthZ),
    new THREE.MeshStandardMaterial({ color: brick, roughness: 0.9, metalness: 0.04 }),
  );
  body.position.y = h / 2;
  g.add(body);

  // Party-wall strips (shared wall read)
  for (const z of [-depthZ / 2 + 0.06, depthZ / 2 - 0.06]) {
    const party = new THREE.Mesh(
      new THREE.BoxGeometry(depthX + 0.08, h + 0.1, 0.14),
      brickMat(0x2a2428),
    );
    party.position.set(0, h / 2, z);
    g.add(party);
  }

  // Pitched roof ridge along street
  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(depthX + 0.5, 0.35, depthZ + 0.1),
    brickMat(0x1e1814),
  );
  roof.position.y = h + 0.15;
  g.add(roof);
  const pitch = new THREE.Mesh(
    new THREE.ConeGeometry(depthX * 0.55, 1.15, 4),
    brickMat(0x2a2018),
  );
  pitch.rotation.y = Math.PI / 4;
  pitch.scale.set(1, 1, depthZ / depthX);
  pitch.position.y = h + 0.85;
  g.add(pitch);

  if (Math.random() > 0.25) {
    const chim = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 1.2 + Math.random() * 0.5, 0.45),
      brickMat(0x2a1c18),
    );
    chim.position.set(side * 0.5, h + 1.4, depthZ * 0.28 * (Math.random() > 0.5 ? 1 : -1));
    g.add(chim);
  }

  const faceX = side * -(depthX / 2 + 0.02);
  const neonColor = pick(theme.neon);

  // Front door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 1.85, 0.75),
    new THREE.MeshStandardMaterial({ color: 0x1a2430, roughness: 0.7 }),
  );
  door.position.set(faceX, 0.95, -depthZ * 0.18);
  g.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), neonMat(0xffd9a0, 1.2));
  knob.position.set(faceX - side * 0.06, 1.0, -depthZ * 0.18 + 0.28);
  g.add(knob);

  // Ground shop or bay
  if (Math.random() < theme.shopChance) {
    const shop = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.4, depthZ * 0.42),
      neonMat(Math.random() > 0.5 ? 0xffb347 : neonColor, 1.0 + Math.random() * 0.5),
    );
    shop.position.set(faceX - side * 0.06, 1.15, depthZ * 0.2);
    g.add(shop);
    if (Math.random() < theme.neonChance) {
      const fascia = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.28, depthZ * 0.5),
        neonMat(neonColor, 2.4),
      );
      fascia.position.set(faceX - side * 0.1, 2.15, depthZ * 0.2);
      g.add(fascia);
    }
  }

  // Sash windows — warm, domestic
  for (let story = 0; story < stories; story++) {
    const y = 3.1 + story * storyH;
    for (const z of [-depthZ * 0.22, depthZ * 0.22]) {
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.05, 0.72),
        new THREE.MeshStandardMaterial({ color: 0x1a1814, roughness: 0.75 }),
      );
      frame.position.set(faceX, y, z);
      g.add(frame);
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 0.88, 0.58),
        windowLit(theme, 0.85),
      );
      pane.position.set(faceX - side * 0.04, y, z);
      g.add(pane);
      // Sash bar
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.06, 0.58),
        brickMat(0x141210),
      );
      bar.position.set(faceX - side * 0.03, y, z);
      g.add(bar);
    }
  }

  if (Math.random() > 0.45) {
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.07, depthZ * 0.45),
      new THREE.MeshStandardMaterial({
        color: neonColor,
        emissive: neonColor,
        emissiveIntensity: 0.35,
        roughness: 0.7,
      }),
    );
    awning.position.set(faceX - side * 0.55, 2.2, depthZ * 0.2);
    awning.rotation.z = side * 0.1;
    g.add(awning);
  }

  g.userData.depthX = depthX;
  g.userData.depthZ = depthZ;
  g.userData.height = h;
  return g;
}

/** Crowded gothic / old-town stone — pointed gables, buttresses, amber windows */
function buildGothicHouse(side, theme) {
  const g = new THREE.Group();
  const stories = theme.storiesMin + Math.floor(Math.random() * (theme.storiesMax - theme.storiesMin + 1));
  const storyH = 2.55;
  const h = 3.6 + stories * storyH;
  const depthZ = 3.4 + Math.random() * 2.2;
  const depthX = 3.0 + Math.random() * 1.4;
  const stone = pick(theme.brick);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(depthX, h, depthZ),
    new THREE.MeshStandardMaterial({ color: stone, roughness: 0.95, metalness: 0.02 }),
  );
  body.position.y = h / 2;
  g.add(body);

  // Stepped buttress on street face
  if (Math.random() > 0.35) {
    const butt = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, h * 0.7, 0.7),
      brickMat(0x1a1816),
    );
    butt.position.set(side * -(depthX / 2 + 0.2), h * 0.35, depthZ * 0.35);
    butt.rotation.z = side * 0.08;
    g.add(butt);
  }

  // Pointed gable
  const gable = new THREE.Mesh(
    new THREE.ConeGeometry(depthZ * 0.55, 2.4 + Math.random() * 1.4, 3),
    brickMat(0x141210),
  );
  gable.rotation.y = Math.PI;
  gable.position.set(0, h + 1.2, 0);
  g.add(gable);

  // Spire tip
  if (Math.random() > 0.4) {
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 2.2 + Math.random(), 5),
      brickMat(0x0e0c0a),
    );
    spire.position.y = h + 3.2;
    g.add(spire);
  }

  // Cornice teeth
  for (let i = 0; i < 4; i++) {
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(depthX * 0.15, 0.35, 0.35),
      brickMat(0x1c1814),
    );
    tooth.position.set(
      (i - 1.5) * (depthX * 0.22),
      h + 0.15,
      side * -(depthZ * 0.35),
    );
    g.add(tooth);
  }

  const faceX = side * -(depthX / 2 + 0.02);

  // Arched door (tall thin + pointed cap)
  const archDoor = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 2.4, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x0c0a08, roughness: 0.85 }),
  );
  archDoor.position.set(faceX, 1.25, 0);
  g.add(archDoor);
  const archCap = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.7, 3),
    brickMat(0x12100e),
  );
  archCap.rotation.z = Math.PI;
  archCap.position.set(faceX - side * 0.02, 2.65, 0);
  g.add(archCap);

  // Tall lancet windows — candle amber
  for (let story = 0; story < stories; story++) {
    const y = 3.4 + story * storyH;
    const cols = 1 + Math.floor(Math.random() * 2);
    for (let c = 0; c < cols; c++) {
      const z = (c - (cols - 1) / 2) * (depthZ * 0.28);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.45, 0.55),
        brickMat(0x0e0c0a),
      );
      frame.position.set(faceX, y, z);
      g.add(frame);
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.2, 0.4),
        windowLit(theme, 0.95),
      );
      pane.position.set(faceX - side * 0.04, y, z);
      g.add(pane);
      const peak = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.4, 3),
        brickMat(0x12100e),
      );
      peak.rotation.z = Math.PI;
      peak.position.set(faceX - side * 0.02, y + 0.85, z);
      g.add(peak);
    }
  }

  // Occasional hanging lantern
  if (Math.random() < 0.45) {
    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 6, 6),
      neonMat(0xffb060, 2.8),
    );
    lantern.position.set(faceX - side * 0.55, 3.2, depthZ * 0.2);
    g.add(lantern);
  }

  g.userData.depthX = depthX;
  g.userData.depthZ = depthZ;
  g.userData.height = h;
  return g;
}

function buildDowntownFacade(side, theme) {
  const g = new THREE.Group();
  const stories =
    theme.storiesMin + Math.floor(Math.random() * (theme.storiesMax - theme.storiesMin + 1));
  const storyH = 2.7;
  const h = 3.4 + stories * storyH;
  const depthZ = 5.2 + Math.random() * 3.2;
  const depthX = 3.2 + Math.random() * 1.4;
  const brick = pick(theme.brick);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(depthX, h, depthZ),
    new THREE.MeshStandardMaterial({
      color: brick,
      roughness: 0.55,
      metalness: 0.45,
    }),
  );
  body.position.y = h / 2;
  g.add(body);

  for (let i = 0; i < Math.min(stories, 6); i++) {
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(depthX + 0.04, 0.12, depthZ + 0.04),
      brickMat(0x2a3448),
    );
    band.position.y = 2.8 + i * storyH;
    g.add(band);
  }

  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(depthX + 0.3, 0.4, depthZ + 0.2),
    brickMat(0x1a1c24),
  );
  cornice.position.y = h + 0.12;
  g.add(cornice);

  const faceX = side * -(depthX / 2 + 0.02);
  const shopH = 2.7;
  const neonColor = pick(theme.neon);

  if (Math.random() < theme.shopChance) {
    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, shopH, depthZ * 0.92),
      new THREE.MeshStandardMaterial({ color: 0x10141c, roughness: 0.5, metalness: 0.3 }),
    );
    fascia.position.set(faceX, shopH / 2, 0);
    g.add(fascia);

    const shopWin = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 1.55, depthZ * 0.7),
      neonMat(Math.random() > 0.45 ? 0xffb347 : pick(theme.neon), 1.1 + Math.random() * 0.7),
    );
    shopWin.position.set(faceX - side * 0.08, 1.4, 0);
    g.add(shopWin);

    if (Math.random() < theme.neonChance) {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.4 + Math.random() * 0.2, depthZ * (0.4 + Math.random() * 0.3)),
        neonMat(neonColor, 3.4),
      );
      sign.position.set(faceX - side * 0.12, shopH + 0.3, 0);
      g.add(sign);
    }
  }

  if (Math.random() < theme.neonChance) {
    const tube = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, h * 0.6, 0.1),
      neonMat(pick(theme.neon), 2.8),
    );
    tube.position.set(faceX - side * 0.05, h * 0.5, -depthZ * 0.42);
    g.add(tube);
  }

  for (let story = 1; story < stories; story++) {
    const y = shopH + 0.95 + (story - 1) * storyH;
    const cols = 3;
    for (let c = 0; c < cols; c++) {
      const z = (c - (cols - 1) / 2) * (depthZ * 0.28);
      const frame = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 1.2, 0.9),
        new THREE.MeshStandardMaterial({ color: 0x12151c, roughness: 0.65 }),
      );
      frame.position.set(faceX, y, z);
      g.add(frame);
      const pane = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.0, 0.72),
        windowLit(theme, 0.35),
      );
      pane.position.set(faceX - side * 0.04, y, z);
      g.add(pane);
    }
  }

  if (Math.random() > 0.5) {
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x3a4250,
      roughness: 0.55,
      metalness: 0.75,
    });
    for (let s = 0; s < Math.min(3, stories - 1); s++) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, depthZ * 0.5), railMat);
      rail.position.set(faceX - side * 0.45, shopH + 1.15 + s * storyH, 0);
      g.add(rail);
    }
  }

  g.userData.depthX = depthX;
  g.userData.depthZ = depthZ;
  g.userData.height = h;
  return g;
}

function buildFacade(side, theme) {
  if (theme.mode === 'suburb') return buildSuburbHouse(side, theme);
  if (theme.mode === 'borough') return buildTerraceHouse(side, theme);
  if (theme.mode === 'oldtown') return buildGothicHouse(side, theme);
  return buildDowntownFacade(side, theme);
}

function buildGothicTower(side, theme) {
  const g = new THREE.Group();
  const h = 18 + Math.random() * 22;
  const w = 2.4 + Math.random() * 1.8;
  const d = 2.4 + Math.random() * 1.8;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0x181614, roughness: 0.95, metalness: 0.02 }),
  );
  body.position.y = h / 2;
  g.add(body);
  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(w * 0.55, 6 + Math.random() * 4, 4),
    brickMat(0x0e0c0a),
  );
  spire.position.y = h + 3.2;
  g.add(spire);
  // Amber slit windows
  const faceX = side * -(w / 2 + 0.02);
  for (let r = 0; r < Math.floor(h / 3.2); r++) {
    if (Math.random() > 0.55) continue;
    const slit = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.9, 0.28),
      neonMat(0xffa050, 1.4),
    );
    slit.position.set(faceX, 3 + r * 3.2, 0);
    g.add(slit);
  }
  return g;
}

function buildBackTower(side, theme) {
  if (theme.mode === 'oldtown') return buildGothicTower(side, theme);

  const g = new THREE.Group();
  const h =
    theme.mode === 'downtown'
      ? 22 + Math.random() * 36
      : theme.mode === 'suburb'
        ? 6 + Math.random() * 8
        : theme.mode === 'borough'
          ? 8 + Math.random() * 6
          : 16 + Math.random() * 24;
  const w = 3.2 + Math.random() * 4.5;
  const d = 3.2 + Math.random() * 4;
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color: theme.mode === 'downtown' ? 0x0c1018 : 0x161a28,
      roughness: 0.7,
      metalness: theme.mode === 'downtown' ? 0.5 : 0.2,
    }),
  );
  body.position.y = h / 2;
  g.add(body);

  const faceX = side * -(w / 2 + 0.02);
  const rows = Math.floor(h / 2.1);
  for (let r = 0; r < rows; r++) {
    if (Math.random() > (theme.mode === 'downtown' ? 0.25 : 0.4)) continue;
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.22, d * 0.7),
      neonMat(pick(theme.neon), 1.1 + Math.random()),
    );
    strip.position.set(faceX, 2.2 + r * 2.1, 0);
    g.add(strip);
  }

  const tip = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.85, 0.3, d * 0.85),
    neonMat(pick(theme.neon), 1.8),
  );
  tip.position.y = h + 0.1;
  g.add(tip);

  if (theme.mode === 'downtown') {
    const ant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.5, 4),
      neonMat(pick(theme.neon), 3),
    );
    ant.position.y = h + 1.8;
    g.add(ant);
  }

  return g;
}

export function createWorld(scene) {
  const root = new THREE.Group();
  scene.add(root);

  const sky = createSky(scene);

  let level = LEVELS[0];
  let theme = level.theme;
  let recycleSpan = 34 * theme.buildingSpacing;

  // Wide earth under everything — suburbs had gaps that fell into void
  const groundMat = new THREE.MeshStandardMaterial({
    color: theme.ground ?? 0x1a2418,
    roughness: 0.95,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(120, SEGMENT * SEGMENTS + 80),
    groundMat,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.04;
  ground.position.z = -((SEGMENT * SEGMENTS) / 2);
  root.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(ROAD_W, SEGMENT * SEGMENTS + 40),
    new THREE.MeshStandardMaterial({
      color: theme.road,
      roughness: 0.16,
      metalness: 0.78,
    }),
  );
  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.01;
  road.position.z = -((SEGMENT * SEGMENTS) / 2);
  root.add(road);

  const paveMat = new THREE.MeshStandardMaterial({
    color: theme.pave,
    roughness: 0.72,
    metalness: 0.12,
  });
  const paves = [];
  for (const x of [-ROAD_W / 2 - 1.35, ROAD_W / 2 + 1.35]) {
    const pave = new THREE.Mesh(new THREE.PlaneGeometry(2.5, SEGMENT * SEGMENTS + 40), paveMat);
    pave.rotation.x = -Math.PI / 2;
    pave.position.set(x, 0.025, -((SEGMENT * SEGMENTS) / 2));
    root.add(pave);
    paves.push(pave);
  }

  const curbMat = new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.65, metalness: 0.25 });
  for (const x of [-ROAD_W / 2 - 0.12, ROAD_W / 2 + 0.12]) {
    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.16, SEGMENT * SEGMENTS + 40),
      curbMat,
    );
    curb.position.set(x, 0.08, -((SEGMENT * SEGMENTS) / 2));
    root.add(curb);
  }

  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xc0c8d8,
    emissive: 0x2a3a55,
    emissiveIntensity: 0.25,
    roughness: 0.45,
  });
  const dashes = [];
  for (let i = 0; i < 40; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 1.0), dashMat);
    dash.position.set(0, 0.025, -i * 4.5);
    root.add(dash);
    dashes.push(dash);
  }

  const manholeMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e28,
    roughness: 0.4,
    metalness: 0.65,
  });
  const manholes = [];
  for (let i = 0; i < 12; i++) {
    const mh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 12), manholeMat);
    mh.position.set((Math.random() - 0.5) * 2.2, 0.03, -i * 28 - 8);
    root.add(mh);
    manholes.push(mh);
  }

  const props = new THREE.Group();
  root.add(props);

  const pool = {
    lamps: [],
    buildings: [],
    towers: [],
    obstacles: [],
    pickups: [],
    clutter: [],
  };

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x222830, roughness: 0.5, metalness: 0.6 });

  function spawnLamp(z, side) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 6), poleMat);
    pole.position.y = 1.8;
    g.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.07, 0.07), poleMat);
    arm.position.set(side * -0.4, 3.55, 0);
    g.add(arm);

    const bulbCol =
      theme.mode === 'suburb' || theme.mode === 'oldtown' ? 0xffe0a0 : 0xffd9a0;
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), neonMat(bulbCol, 3.5));
    bulb.position.set(side * -0.8, 3.4, 0);
    g.add(bulb);

    const light = new THREE.PointLight(
      theme.mode === 'oldtown' ? 0xffa050 : 0xffc878,
      theme.mode === 'downtown' ? 7 : theme.mode === 'oldtown' ? 4.5 : 5.5,
      15,
      2,
    );
    light.position.copy(bulb.position);
    g.add(light);

    if (theme.mode !== 'suburb' && theme.mode !== 'oldtown' && theme.mode !== 'borough') {
      const accent = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.14, 0.14),
        neonMat(pick(theme.neon), 2.2),
      );
      accent.position.set(0, 2.4, 0);
      g.add(accent);
    }

    g.position.set(side * (ROAD_W / 2 + 0.55), 0, z);
    props.add(g);
    pool.lamps.push({ group: g, bulb });
  }

  function spawnTree(z, side) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 1.6, 5),
      new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.9 }),
    );
    trunk.position.y = 0.8;
    g.add(trunk);
    const canopy = new THREE.Mesh(
      new THREE.SphereGeometry(1.1 + Math.random() * 0.4, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x1a3020,
        emissive: 0x0a1810,
        emissiveIntensity: 0.2,
        roughness: 0.95,
      }),
    );
    canopy.position.y = 2.3;
    g.add(canopy);
    g.position.set(side * (ROAD_W / 2 + 2.8 + Math.random()), 0, z);
    props.add(g);
    pool.clutter.push(g);
  }

  function spawnHedge(z, side) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.9 + Math.random() * 0.4, 2.5 + Math.random() * 2),
      new THREE.MeshStandardMaterial({ color: 0x1a2a1c, roughness: 0.95 }),
    );
    mesh.position.set(side * (ROAD_W / 2 + 2.2), 0.55, z);
    props.add(mesh);
    pool.clutter.push(mesh);
  }

  function spawnBuilding(z, side) {
    const facade = buildFacade(side, theme);
    const gap =
      theme.mode === 'suburb' ? 3.2 : theme.mode === 'oldtown' ? 1.55 : theme.mode === 'borough' ? 2.1 : 2.4;
    const x = side * (ROAD_W / 2 + gap + facade.userData.depthX * 0.5);
    facade.position.set(x, 0, z);
    props.add(facade);
    pool.buildings.push(facade);

    if (Math.random() < theme.towerChance) {
      const tower = buildBackTower(side, theme);
      tower.position.set(
        side * (ROAD_W / 2 + (theme.mode === 'suburb' ? 10 : theme.mode === 'oldtown' ? 6 : 8) + Math.random() * 6),
        0,
        z + (Math.random() - 0.5) * 3,
      );
      props.add(tower);
      pool.towers.push(tower);
    }
  }

  function spawnClutter(z, side) {
    const roll = Math.random();
    let mesh;
    if (theme.mode === 'suburb' && roll < 0.4) {
      // Wheelie bin / garden crate
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.85, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x2a4030, roughness: 0.75 }),
      );
      mesh.position.y = 0.42;
    } else if (roll < 0.5) {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.95, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x2a303c, roughness: 0.7 }),
      );
      mesh.position.y = 0.48;
    } else {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.45, 0.55),
        new THREE.MeshStandardMaterial({ color: 0x3a2840, roughness: 0.8 }),
      );
      mesh.position.y = 0.25;
    }
    mesh.position.set(side * (ROAD_W / 2 + 1.55), mesh.position.y, z);
    props.add(mesh);
    pool.clutter.push(mesh);
  }

  function spawnCable(z) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-ROAD_W / 2 - 1.8, 5.5 + Math.random(), z),
      new THREE.Vector3(0, 4.2 + Math.random() * 0.6, z + (Math.random() - 0.5)),
      new THREE.Vector3(ROAD_W / 2 + 1.8, 5.5 + Math.random(), z),
    ]);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 12, 0.03, 4, false),
      new THREE.MeshStandardMaterial({ color: 0x1a1e28, roughness: 0.7, metalness: 0.4 }),
    );
    props.add(tube);
    pool.clutter.push(tube);

    if (Math.random() > 0.55) {
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        neonMat(pick(theme.neon), 2.2),
      );
      bulb.position.copy(curve.getPoint(0.5));
      props.add(bulb);
      pool.clutter.push(bulb);
    }
  }

  const goal = new THREE.Group();
  const venue = new THREE.Mesh(new THREE.BoxGeometry(9, 8, 6), brickMat(0x242028));
  venue.position.y = 4;
  goal.add(venue);

  const neonSignMat = neonMat(0x5cffb0, 3.6);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(5.5, 1.1, 0.2), neonSignMat);
  sign.position.set(0, 6.2, 3.2);
  goal.add(sign);

  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.2, 0.15), neonMat(0x3d8bfd, 2.6));
  door.position.set(0, 1.6, 3.15);
  goal.add(door);

  const goalLight = new THREE.PointLight(0x5cffb0, 22, 42, 2);
  goalLight.position.set(0, 4, 4);
  goal.add(goalLight);

  const awning = new THREE.Mesh(
    new THREE.BoxGeometry(6, 0.15, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x2a3040, roughness: 0.6 }),
  );
  awning.position.set(0, 3.4, 3.6);
  goal.add(awning);

  goal.position.z = -(level.goal + 20);
  goal.visible = false;
  root.add(goal);

  const vanGeo = new THREE.BoxGeometry(1.8, 1.6, 3.2);
  const vanMat = new THREE.MeshStandardMaterial({ color: 0x2a303c, roughness: 0.5, metalness: 0.35 });
  const binGeo = new THREE.CylinderGeometry(0.45, 0.5, 1.1, 8);
  const binMat = new THREE.MeshStandardMaterial({ color: 0x343a48, roughness: 0.7 });
  const coffeeGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.45, 10);
  const coffeeMat = neonMat(0xffb347, 2.8);

  const coatColors = [0x1a2430, 0x2a2030, 0x1e2820, 0x302820, 0x222830, 0x3a2830, 0x243028];
  const umbrellaColors = [0x1a3040, 0x301820, 0x202830, 0x1a2820, 0x402028];

  function buildPasserby() {
    const g = new THREE.Group();
    const coat = pick(coatColors);
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.2, 0.5, 4, 6),
      new THREE.MeshStandardMaterial({ color: coat, roughness: 0.88 }),
    );
    body.position.y = 0.95;
    g.add(body);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xc4a080, roughness: 0.7 }),
    );
    head.position.y = 1.52;
    g.add(head);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x12161c, roughness: 0.9 });
    const legL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.42, 0.12), legMat);
    const legR = legL.clone();
    legL.position.set(-0.09, 0.22, 0);
    legR.position.set(0.09, 0.22, 0);
    g.add(legL, legR);

    // Rain coat hood / hair blob
    if (Math.random() > 0.55) {
      const hood = new THREE.Mesh(
        new THREE.SphereGeometry(0.17, 6, 6),
        new THREE.MeshStandardMaterial({ color: coat, roughness: 0.9 }),
      );
      hood.position.set(0, 1.58, -0.02);
      hood.scale.set(1, 0.85, 1.1);
      g.add(hood);
    }

    if (Math.random() > 0.4) {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.65, 4),
        new THREE.MeshStandardMaterial({ color: 0x1a1a20, metalness: 0.4, roughness: 0.5 }),
      );
      stem.position.set(0.26, 1.45, 0.05);
      g.add(stem);
      const canopy = new THREE.Mesh(
        new THREE.ConeGeometry(0.42, 0.22, 8),
        new THREE.MeshStandardMaterial({
          color: pick(umbrellaColors),
          roughness: 0.55,
          metalness: 0.1,
        }),
      );
      canopy.position.set(0.26, 1.82, 0.05);
      canopy.rotation.x = Math.PI;
      g.add(canopy);
    }

    g.userData.legs = [legL, legR];
    g.userData.body = body;
    return g;
  }

  let nextObstacleAt = 40;
  let nextPickupAt = 55;

  function clearDynamic() {
    for (const o of pool.obstacles) props.remove(o.mesh);
    for (const p of pool.pickups) props.remove(p.mesh);
    pool.obstacles.length = 0;
    pool.pickups.length = 0;
  }

  function clearScenery() {
    for (const l of pool.lamps) props.remove(l.group);
    for (const b of pool.buildings) props.remove(b);
    for (const t of pool.towers) props.remove(t);
    for (const c of pool.clutter) props.remove(c);
    pool.lamps.length = 0;
    pool.buildings.length = 0;
    pool.towers.length = 0;
    pool.clutter.length = 0;
  }

  function seedScenery() {
    clearScenery();
    const spacing = theme.buildingSpacing;
    const count = 34;
    recycleSpan = count * spacing;

    for (let i = 0; i < count; i++) {
      const z = -i * spacing - 3;
      spawnLamp(z, i % 2 === 0 ? -1 : 1);

      if (theme.mode === 'borough') {
        // One house per slot, flush terrace both sides
        spawnBuilding(z, -1);
        spawnBuilding(z - spacing * 0.5, 1);
      } else if (theme.mode === 'oldtown') {
        // Packed — double seed, tight stagger
        spawnBuilding(z, -1);
        spawnBuilding(z - spacing * 0.35, 1);
        if (Math.random() < 0.85) spawnBuilding(z - spacing * 0.18, -1);
        if (Math.random() < 0.85) spawnBuilding(z - spacing * 0.55, 1);
        if (Math.random() < 0.5) spawnBuilding(z - spacing * 0.7, -1);
      } else {
        if (Math.random() < theme.denseness) spawnBuilding(z, -1);
        if (Math.random() < theme.denseness) spawnBuilding(z - spacing * 0.45, 1);

        if (theme.mode === 'downtown') {
          if (i % 2 === 0 && Math.random() < theme.denseness) spawnBuilding(z - spacing * 0.25, -1);
          if (i % 2 === 1 && Math.random() < theme.denseness) spawnBuilding(z - spacing * 0.7, 1);
        } else if (theme.mode === 'suburb') {
          if (i % 2 === 0) spawnHedge(z - 1, -1);
          if (i % 2 === 1) spawnHedge(z - 1.5, 1);
          if (Math.random() < theme.treeChance) spawnTree(z - 2, -1);
          if (Math.random() < theme.treeChance) spawnTree(z - 3, 1);
        }
      }

      if (theme.mode !== 'suburb') {
        if (Math.random() < theme.treeChance) spawnTree(z - Math.random() * 4, Math.random() > 0.5 ? -1 : 1);
        if (Math.random() < theme.hedgeChance) spawnHedge(z - 2, Math.random() > 0.5 ? -1 : 1);
      }
      if (Math.random() > 0.55) spawnClutter(z - Math.random() * 4, Math.random() > 0.5 ? -1 : 1);
      if (Math.random() < theme.cableChance) spawnCable(z - 2);
    }
  }

  function spawnObstacle(z) {
    const roll = Math.random();
    let mesh;
    let radius;
    let driveSpeed = 0; // world units/sec toward -z (same way as rider)
    let strafeSpeed = 0; // cross-street walk (x)
    let phase = 0;
    // Suburbs: more walkers/bins, fewer vans
    // Mix shifts by district; spawn *rate* comes from level.obstacleGap*
    const vanChance =
      theme.mode === 'suburb'
        ? 0.2
        : theme.mode === 'borough'
          ? 0.32
          : theme.mode === 'downtown'
            ? 0.48
            : 0.28; // oldtown: denser overall, more walkers than vans
    const walkerChance =
      theme.mode === 'suburb'
        ? 0.4
        : theme.mode === 'borough'
          ? 0.42
          : theme.mode === 'downtown'
            ? 0.38
            : 0.58;

    // hitShape: box uses halfX/halfZ (tighter than circle around long vans)
    let hitShape = 'circle';
    let halfX = 0;
    let halfZ = 0;
    let kind = 'bin';

    if (roll < vanChance) {
      kind = 'van';
      // Fresh material per van — flash on bump without tinting the shared mat
      mesh = new THREE.Mesh(
        vanGeo,
        new THREE.MeshStandardMaterial({ color: 0x2a303c, roughness: 0.5, metalness: 0.35 }),
      );
      mesh.position.y = 0.85;
      // Visual box 1.8 × 3.2 → collide slightly inside the mesh
      hitShape = 'box';
      halfX = 0.7;
      halfZ = 1.25;
      radius = 1.0; // fallback / radar
      driveSpeed = 4.5 + Math.random() * 7.5; // 4.5–12
      for (const sx of [-0.55, 0.55]) {
        const tl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.08), neonMat(0xff1040, 2.8));
        tl.position.set(sx, 0.3, 1.65);
        mesh.add(tl);
        const hl = new THREE.Mesh(
          new THREE.BoxGeometry(0.18, 0.1, 0.06),
          neonMat(0xfff0c8, 2.2),
        );
        hl.position.set(sx, 0.15, -1.65);
        mesh.add(hl);
      }
      const lane = [-2.2, 0, 2.2][Math.floor(Math.random() * 3)];
      mesh.position.x = Math.random() < 0.35 ? 0 : lane;
    } else if (roll < vanChance + walkerChance) {
      kind = 'walker';
      mesh = buildPasserby();
      radius = 0.34;
      phase = Math.random() * Math.PI * 2;
      // Mostly left → right; some reverse
      const goRight = Math.random() > 0.22;
      strafeSpeed = (goRight ? 1 : -1) * (1.6 + Math.random() * 1.4);
      mesh.position.x = goRight ? -(ROAD_W / 2 + 1.4) : ROAD_W / 2 + 1.4;
      // Face walk direction (default mesh faces -Z)
      mesh.rotation.y = goRight ? -Math.PI / 2 : Math.PI / 2;
    } else {
      kind = 'bin';
      mesh = new THREE.Mesh(binGeo, binMat);
      mesh.position.y = 0.55;
      hitShape = 'box';
      halfX = 0.38;
      halfZ = 0.38;
      radius = 0.45;
      const lane = [-2.2, 0, 2.2][Math.floor(Math.random() * 3)];
      mesh.position.x = Math.random() < 0.4 ? lane : (Math.random() < 0.5 ? -2.1 : 2.1);
    }

    mesh.position.z = z;
    props.add(mesh);
    pool.obstacles.push({
      mesh,
      kind,
      radius,
      halfX,
      halfZ,
      hitShape,
      driveSpeed,
      strafeSpeed,
      phase,
      bumps: 0,
      cool: 0,
    });
  }

  function spawnPickup(z) {
    const mesh = new THREE.Mesh(coffeeGeo, coffeeMat);
    mesh.position.set((Math.random() - 0.5) * 4.8, 0.9, z);
    const halo = new THREE.PointLight(0xffb347, 3, 8, 2);
    halo.position.y = 0.3;
    mesh.add(halo);
    props.add(mesh);
    // Fixed phase — bob pace stays steady (z used to drift the wave)
    pool.pickups.push({ mesh, radius: 0.7, phase: Math.random() * Math.PI * 2 });
  }

  function applySurfaceColors() {
    groundMat.color.setHex(theme.ground ?? 0x12141c);
    groundMat.roughness = theme.mode === 'suburb' ? 0.92 : 0.85;
    // Night read — suburbs lawn needs self-glow or it reads as void
    if (theme.mode === 'suburb') {
      groundMat.emissive.setHex(0x1a3a1c);
      groundMat.emissiveIntensity = 0.55;
    } else {
      groundMat.emissive.setHex(0x000000);
      groundMat.emissiveIntensity = 0;
    }
    road.material.color.setHex(theme.road);
    paveMat.color.setHex(theme.pave);
    venue.material.color.setHex(
      theme.mode === 'suburb'
        ? 0x3a342e
        : theme.mode === 'downtown'
          ? 0x101828
          : theme.mode === 'oldtown'
            ? 0x1a1612
            : 0x2a2428,
    );
    if (theme.mode === 'suburb') {
      neonSignMat.color.setHex(0xffb347);
      neonSignMat.emissive.setHex(0xffb347);
      goalLight.color.setHex(0xffb347);
    } else if (theme.mode === 'downtown') {
      neonSignMat.color.setHex(0xff2d6a);
      neonSignMat.emissive.setHex(0xff2d6a);
      goalLight.color.setHex(0xff2d6a);
    } else if (theme.mode === 'oldtown') {
      neonSignMat.color.setHex(0xffa050);
      neonSignMat.emissive.setHex(0xffa050);
      goalLight.color.setHex(0xffa050);
    } else {
      neonSignMat.color.setHex(0xff9f1c);
      neonSignMat.emissive.setHex(0xff9f1c);
      goalLight.color.setHex(0xff9f1c);
    }
  }

  seedScenery();
  sky.applyTheme(theme);

  return {
    setLevel(next) {
      level = next;
      theme = next.theme;
      applySurfaceColors();
      sky.applyTheme(theme);
      this.reset();
    },

    reset() {
      nextObstacleAt = level.obstacleStart;
      nextPickupAt = level.pickupStart;
      clearDynamic();
      seedScenery();
      goal.position.z = -(level.goal + 20);
      goal.visible = false;
      const zMid = -((SEGMENT * SEGMENTS) / 2);
      road.position.z = zMid;
      ground.position.z = zMid;
      for (const p of paves) p.position.z = zMid;
    },

    getRadar() {
      return {
        obstacles: pool.obstacles.map((o) => ({
          x: o.mesh.position.x,
          z: o.mesh.position.z,
        })),
        pickups: pool.pickups.map((p) => ({
          x: p.mesh.position.x,
          z: p.mesh.position.z,
        })),
      };
    },

    pulse(t) {
      neonSignMat.emissiveIntensity = 2.8 + Math.sin(t * 3.2) * 1.1;
      for (const l of pool.lamps) {
        l.bulb.material.emissiveIntensity = 3.0 + Math.sin(t * 2 + l.group.position.z) * 0.5;
      }
    },

    update(dt, player, distance, time) {
      const move = player.speed * dt;

      sky.update(time ?? performance.now() * 0.001, player.group.position);

      for (const l of pool.lamps) l.group.position.z += move;
      for (const b of pool.buildings) b.position.z += move;
      for (const t of pool.towers) t.position.z += move;
      for (const c of pool.clutter) c.position.z += move;
      const t = time ?? performance.now() * 0.001;
      for (const o of pool.obstacles) {
        // Scroll with world, then drive forward (same direction as you)
        o.mesh.position.z += move;
        if (o.driveSpeed > 0) o.mesh.position.z -= o.driveSpeed * dt;
        if (o.cool > 0) o.cool = Math.max(0, o.cool - dt);
        if (o.strafeSpeed) {
          o.mesh.position.x += o.strafeSpeed * dt;
          // Walk cycle
          const legs = o.mesh.userData.legs;
          if (legs) {
            const swing = Math.sin(t * 9 + o.phase) * 0.45;
            legs[0].rotation.x = swing;
            legs[1].rotation.x = -swing;
            o.mesh.position.y = Math.abs(Math.sin(t * 9 + o.phase)) * 0.04;
          }
        }
      }
      for (const p of pool.pickups) p.mesh.position.z += move;
      for (const d of dashes) {
        d.position.z += move;
        if (d.position.z > 8) d.position.z -= 40 * 4.5;
      }
      for (const m of manholes) {
        m.position.z += move;
        if (m.position.z > 10) m.position.z -= 12 * 28;
      }
      goal.position.z += move;

      for (const l of pool.lamps) {
        if (l.group.position.z > 14) l.group.position.z -= recycleSpan;
      }
      for (const b of pool.buildings) {
        if (b.position.z > 18) b.position.z -= recycleSpan;
      }
      for (const t of pool.towers) {
        if (t.position.z > 20) t.position.z -= recycleSpan;
      }
      for (const c of pool.clutter) {
        if (c.position.z > 14) c.position.z -= recycleSpan;
      }

      const goalCut = level.goal - 30;
      while (distance + 80 > nextObstacleAt && nextObstacleAt < goalCut) {
        spawnObstacle(-(nextObstacleAt - distance) - 20);
        const early = distance < 200;
        const [a, b] = early ? level.obstacleGapEarly : level.obstacleGapLate;
        nextObstacleAt += a + Math.random() * b;
      }
      while (distance + 80 > nextPickupAt && nextPickupAt < goalCut - 20) {
        spawnPickup(-(nextPickupAt - distance) - 15);
        nextPickupAt += level.pickupGap[0] + Math.random() * level.pickupGap[1];
      }

      if (distance > level.goal - 130) goal.visible = true;

      for (const p of pool.pickups) {
        // Same angular speed for every cup — only start phase differs
        p.mesh.position.y = 0.9 + Math.sin(t * 2.4 + p.phase) * 0.15;
        p.mesh.rotation.y = t * 1.6 + p.phase;
      }

      const pr = player.radius;
      let crashEvent = null;

      for (let i = pool.obstacles.length - 1; i >= 0; i--) {
        const o = pool.obstacles[i];
        // Passed you, pulled too far ahead, or finished crossing
        if (
          o.mesh.position.z > 10 ||
          o.mesh.position.z < -110 ||
          (o.strafeSpeed && Math.abs(o.mesh.position.x) > ROAD_W / 2 + 3.5)
        ) {
          props.remove(o.mesh);
          pool.obstacles.splice(i, 1);
          continue;
        }

        const px = player.group.position.x;
        const pz = player.group.position.z;
        let overlapping = false;

        if (o.hitShape === 'box') {
          overlapping =
            Math.abs(o.mesh.position.x - px) < o.halfX + pr &&
            Math.abs(o.mesh.position.z - pz) < o.halfZ + pr;
        } else {
          const dx = o.mesh.position.x - px;
          const dz = o.mesh.position.z - pz;
          const r = o.radius + pr;
          overlapping = dx * dx + dz * dz < r * r;
        }

        if (!overlapping) continue;

        // Solid vans: always resolve (even during cool / invuln) — no phase-through
        if (o.kind === 'van') {
          const ox = o.mesh.position.x;
          const oz = o.mesh.position.z;
          const penX = o.halfX + pr - Math.abs(px - ox);
          const penZ = o.halfZ + pr - Math.abs(pz - oz);

          if (penX > 0 && penZ > 0) {
            if (penX < penZ) {
              const nx = px >= ox ? 1 : -1;
              player.setX(ox + nx * (o.halfX + pr + 0.04));
              player.block(nx, 0);
            } else {
              if (oz <= 0) {
                o.mesh.position.z = -(o.halfZ + pr + 0.06);
              } else {
                o.mesh.position.z = o.halfZ + pr + 0.06;
              }
              player.block(0);
            }
          }

          if (o.cool <= 0 && player.invuln <= 0 && !crashEvent) {
            o.bumps += 1;
            o.cool = 1.15;
            const mat = o.mesh.material;
            if (mat && mat.emissive) {
              mat.emissive.setHex(0xff2a20);
              mat.emissiveIntensity = 0.85;
              setTimeout(() => {
                if (mat) {
                  mat.emissive.setHex(0x000000);
                  mat.emissiveIntensity = 0;
                }
              }, 180);
            }
            crashEvent = {
              type: 'crash',
              penalty: 3.5 + (o.bumps - 1) * 2.5,
              bumps: o.bumps,
              kind: o.kind,
            };
          }
          continue;
        }

        // Walkers / bins — soft hit then clear
        if (player.invuln > 0 || o.cool > 0) continue;
        if (o.mesh.position.z <= -1.8 || o.mesh.position.z >= 1.4) continue;

        o.bumps += 1;
        props.remove(o.mesh);
        pool.obstacles.splice(i, 1);
        if (!crashEvent) {
          crashEvent = {
            type: 'crash',
            penalty: 3.5 + (o.bumps - 1) * 2.5,
            bumps: o.bumps,
            kind: o.kind,
          };
        }
      }

      if (crashEvent) return crashEvent;

      {
        const px = player.group.position.x;
        const pz = player.group.position.z;
        for (let i = pool.pickups.length - 1; i >= 0; i--) {
          const p = pool.pickups[i];
          if (p.mesh.position.z > 10) {
            props.remove(p.mesh);
            pool.pickups.splice(i, 1);
            continue;
          }
          if (player.invuln > 0) continue;
          const dx = p.mesh.position.x - px;
          const dz = p.mesh.position.z - pz;
          if (dx * dx + dz * dz < (p.radius + player.radius) ** 2) {
            props.remove(p.mesh);
            pool.pickups.splice(i, 1);
            return 'pickup';
          }
        }
      }

      return false;
    },
  };
}
