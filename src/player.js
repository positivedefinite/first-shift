import * as THREE from 'three/webgpu';

const ROAD_HALF = 3.35;
/** Spawn lane — right side of road (avoids centerline glitch feel) */
const START_X = 1.85;
/** Absolute top speed — also the speed-meter ceiling. Nothing may exceed this. */
export const BOOST_SPEED = 26;
/** Pedal + Space alone — need a powerup to break past this (70% of meter). */
const SOLO_SPEED = BOOST_SPEED * 0.7;
/** With handling pickup: pedal ceiling before Space (still ≤ BOOST_SPEED). */
const MAX_SPEED = BOOST_SPEED * 0.88;
const STOP_SPEED = 0.35;
const COAST_DRAG = 7.5;
const PEDAL_ACCEL = 8.5;
const BOOST_ACCEL = 13;
const ANGER_COUNT = 10;
/** Good handling pickup: grip/accel bump + unlocks the top of the meter */
const HANDLING_PEAK = 1.12;
const HANDLING_RAMP = 0.6;
const HANDLING_FALL = 2.4;
const HANDLING_TOTAL = HANDLING_RAMP + HANDLING_FALL;
const PICKUP_SPEED_KICK = 2.2;

export function createPlayer(scene) {
  const group = new THREE.Group();
  group.position.set(0, 0, 0);
  scene.add(group);

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x243044,
    roughness: 0.4,
    metalness: 0.7,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x5cffb0,
    emissive: 0x5cffb0,
    emissiveIntensity: 2.2,
    roughness: 0.3,
    metalness: 0.2,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x0a0c12,
    roughness: 0.85,
    metalness: 0.2,
  });

  // Shop fascia ~2.7m — keep rider under the ground-floor signs
  group.scale.setScalar(0.68);

  // Pivot for pedal wobble — keeps road contact stable
  const body = new THREE.Group();
  group.add(body);

  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 1.45), frameMat);
  frame.position.y = 0.85;
  body.add(frame);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.4), accentMat);
  seat.position.set(0, 1.2, 0.18);
  body.add(seat);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.08, 0.08), accentMat);
  handle.position.set(0, 1.28, -0.5);
  body.add(handle);

  const frontWheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.08, 8, 18), wheelMat);
  frontWheel.rotation.y = Math.PI / 2;
  frontWheel.position.set(0, 0.34, -0.58);
  body.add(frontWheel);

  const rearWheel = frontWheel.clone();
  rearWheel.position.z = 0.58;
  body.add(rearWheel);

  const rider = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.22, 0.5, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      emissive: 0x0a2040,
      emissiveIntensity: 0.35,
      roughness: 0.75,
    }),
  );
  rider.position.set(0, 1.5, 0.05);
  body.add(rider);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xe0b898, roughness: 0.65 }),
  );
  head.position.set(0, 2.05, 0.02);
  body.add(head);

  // Hand + phone — pops in beside the ear while on a call
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe0b898, roughness: 0.7 });
  const phoneShellMat = new THREE.MeshStandardMaterial({
    color: 0x151820,
    roughness: 0.35,
    metalness: 0.55,
  });
  const phoneScreenMat = new THREE.MeshStandardMaterial({
    color: 0x5cffb0,
    emissive: 0x3dff9a,
    emissiveIntensity: 2.4,
    roughness: 0.25,
  });
  const phoneHand = new THREE.Group();
  phoneHand.visible = false;
  phoneHand.scale.setScalar(0);
  body.add(phoneHand);

  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.14, 3, 6), skinMat);
  forearm.position.set(-0.04, -0.1, 0.02);
  forearm.rotation.z = -1.05;
  forearm.rotation.x = 0.35;
  phoneHand.add(forearm);

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.045), skinMat);
  palm.position.set(0.05, 0.01, 0.05);
  palm.rotation.set(0.2, 0.45, -0.35);
  phoneHand.add(palm);

  for (let f = 0; f < 3; f++) {
    const finger = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.055, 0.02), skinMat);
    finger.position.set(0.08 + f * 0.02, 0.05, 0.06 + f * 0.008);
    finger.rotation.set(0.5, 0.2, -0.2);
    phoneHand.add(finger);
  }

  const phoneMesh = new THREE.Group();
  phoneMesh.position.set(0.09, 0.05, 0.1);
  phoneMesh.rotation.set(0.25, 0.65, -0.2);
  const phoneBody = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.018), phoneShellMat);
  const phoneScreen = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.12, 0.006), phoneScreenMat);
  phoneScreen.position.z = 0.012;
  phoneMesh.add(phoneBody, phoneScreen);
  phoneHand.add(phoneMesh);

  let phoneBlend = 0;
  let phonePhase = 0;

  function syncPhoneHand(dt) {
    const want = api.onCall && !api.tumbling && !api.lurching;
    phoneBlend = THREE.MathUtils.damp(phoneBlend, want ? 1 : 0, want ? 18 : 14, dt);
    if (phoneBlend < 0.02) {
      phoneHand.visible = false;
      phoneHand.scale.setScalar(0);
      return;
    }
    phonePhase += dt;
    phoneHand.visible = true;
    phoneHand.scale.setScalar(phoneBlend);
    // Right ear — slight talk bob
    phoneHand.position.set(
      0.28 + phoneBlend * 0.02,
      2.02 + Math.sin(phonePhase * 3.2) * 0.014,
      0.05 + Math.sin(phonePhase * 2.1) * 0.008,
    );
    phoneHand.rotation.set(
      0.12 + Math.sin(phonePhase * 2.4) * 0.04,
      0.5,
      -0.4 + Math.sin(phonePhase * 1.8) * 0.05,
    );
    phoneScreenMat.emissiveIntensity = 1.8 + Math.sin(phonePhase * 6) * 0.5;
  }

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.2), accentMat);
  stripe.position.set(0, 1.55, -0.12);
  body.add(stripe);

  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff1c8,
      emissiveIntensity: 5,
    }),
  );
  lamp.position.set(0, 0.95, -0.8);
  body.add(lamp);

  const headLight = new THREE.PointLight(0xfff0c8, 8, 18, 2);
  headLight.position.copy(lamp.position);
  body.add(headLight);

  const trail = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, 2.2),
    new THREE.MeshBasicMaterial({
      color: 0x5cffb0,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  trail.rotation.x = -Math.PI / 2;
  trail.position.set(0, 0.05, 1.2);
  body.add(trail);

  // Angry junk that pops out of his head on crash
  const angerRoot = new THREE.Group();
  angerRoot.position.set(0, 2.35, 0);
  body.add(angerRoot);

  const angerBits = [];
  const steamMat = new THREE.MeshBasicMaterial({
    color: 0xff6b4a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const markMat = new THREE.MeshBasicMaterial({
    color: 0xff2d6a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });

  for (let i = 0; i < ANGER_COUNT; i++) {
    const isMark = i < 4;
    let mesh;
    if (isMark) {
      // little "!" — stem + dot
      mesh = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.06), markMat.clone());
      stem.position.y = 0.12;
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.07), markMat.clone());
      dot.position.y = -0.08;
      mesh.add(stem, dot);
      mesh.userData.mats = [stem.material, dot.material];
    } else {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.07 + Math.random() * 0.05, 6, 6),
        steamMat.clone(),
      );
      mesh.userData.mats = [mesh.material];
    }
    mesh.visible = false;
    angerRoot.add(mesh);
    angerBits.push({
      mesh,
      life: 0,
      maxLife: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      spin: 0,
    });
  }

  function burstAnger() {
    for (const bit of angerBits) {
      bit.life = 0.55 + Math.random() * 0.55;
      bit.maxLife = bit.life;
      bit.vx = (Math.random() - 0.5) * 1.8;
      bit.vy = 1.2 + Math.random() * 2.2;
      bit.vz = (Math.random() - 0.5) * 1.4;
      bit.spin = (Math.random() - 0.5) * 8;
      bit.mesh.position.set(
        (Math.random() - 0.5) * 0.25,
        Math.random() * 0.15,
        (Math.random() - 0.5) * 0.2,
      );
      bit.mesh.rotation.set(0, Math.random() * Math.PI, 0);
      bit.mesh.scale.setScalar(0.7 + Math.random() * 0.6);
      bit.mesh.visible = true;
      for (const m of bit.mesh.userData.mats) m.opacity = 1;
    }
  }

  function updateAnger(dt) {
    for (const bit of angerBits) {
      if (bit.life <= 0) {
        bit.mesh.visible = false;
        continue;
      }
      bit.life -= dt;
      bit.mesh.position.x += bit.vx * dt;
      bit.mesh.position.y += bit.vy * dt;
      bit.mesh.position.z += bit.vz * dt;
      bit.vy -= 1.6 * dt;
      bit.mesh.rotation.z += bit.spin * dt;
      const fade = Math.max(0, bit.life / bit.maxLife);
      for (const m of bit.mesh.userData.mats) m.opacity = fade;
      bit.mesh.scale.setScalar(0.5 + fade * 0.8);
      if (bit.life <= 0) bit.mesh.visible = false;
    }
  }

  const api = {
    group,
    speed: 0,
    vx: 0,
    boostEnergy: 1,
    hitCooldown: 0,
    // Tight vs visuals — fat circle made vans "hit" early
    radius: 0.32,
    stalled: false,
    pedalPhase: 0,
    parkSide: 1,
    startX: START_X,
    handlingT: -1, // <0 inactive; else seconds into envelope
    onCall: false, // girlfriend call — forced slow
    scrapes: 0, // run-wide bump count — each hit slows harder
    tumbling: false,
    lurching: false,
    /** Way Back — forced full speed, steer still works */
    speedLocked: false,
    /** 0..1 ramp toward BOOST_SPEED; kills throttle agency as it rises */
    cruiseFactor: 0,

    // world.js still reads this name for brief post-hit grace
    get invuln() {
      return api.hitCooldown;
    },

    /** Sticky max-speed tax from scrapes (every bump stacks) */
    scrapeMult() {
      return Math.max(0.48, 1 - api.scrapes * 0.11);
    },

    /** Current speed multiplier from good-handling pickup */
    handlingMult() {
      if (api.handlingT < 0) return 1;
      if (api.handlingT < HANDLING_RAMP) {
        return 1 + (HANDLING_PEAK - 1) * (api.handlingT / HANDLING_RAMP);
      }
      if (api.handlingT < HANDLING_TOTAL) {
        const u = (api.handlingT - HANDLING_RAMP) / HANDLING_FALL;
        return HANDLING_PEAK + (1 - HANDLING_PEAK) * u;
      }
      return 1;
    },

    reset() {
      group.position.set(START_X, 0, 0);
      group.rotation.set(0, 0, 0);
      body.rotation.set(0, 0, 0);
      body.position.set(0, 0, 0);
      api.speed = 6;
      api.vx = 0;
      api.boostEnergy = 1;
      api.hitCooldown = 0;
      api.stalled = false;
      api.pedalPhase = 0;
      api.parkSide = 1;
      api.handlingT = -1;
      api.onCall = false;
      api.scrapes = 0;
      api.tumbling = false;
      api.lurching = false;
      api.speedLocked = false;
      api.cruiseFactor = 0;
      api.startX = START_X;
      trail.material.opacity = 0;
      group.visible = true;
      group.position.y = 0;
      rider.rotation.z = 0;
      head.position.x = 0;
      phoneBlend = 0;
      phonePhase = 0;
      phoneHand.visible = false;
      phoneHand.scale.setScalar(0);
      for (const bit of angerBits) {
        bit.life = 0;
        bit.mesh.visible = false;
      }
    },

    /** Start / refresh good-handling — small speed kick, never past BOOST_SPEED */
    goodHandling() {
      // Jump straight to peak so a restack doesn't dip the mult to 1.0
      api.handlingT = HANDLING_RAMP;
      api.speed = Math.min(BOOST_SPEED, api.speed + PICKUP_SPEED_KICK);
      api.boostEnergy = Math.min(1, api.boostEnergy + 0.2);
      api.stalled = false;
    },

    /** Obstacle hit — no clock penalty; speed slam that stacks each scrape */
    punish() {
      api.scrapes += 1;
      const n = api.scrapes;
      // Instant cut: 1st ~45% left, then harsher floor each time
      const keep = Math.max(0.12, 0.48 - (n - 1) * 0.08);
      api.speed = Math.max(0.8, api.speed * keep);
      api.boostEnergy = Math.max(0, api.boostEnergy - 0.2);
      api.hitCooldown = 0.7; // grace only — no blink
      burstAnger();
    },

    /** Way Back — 0..1 gradual pull to full boost; steer still works */
    setCruise(factor) {
      api.cruiseFactor = Math.max(0, Math.min(1, factor));
      api.stalled = false;
      api.onCall = false;
      if (api.cruiseFactor >= 0.98) {
        api.speedLocked = true;
        api.speed = BOOST_SPEED;
        api.boostEnergy = 1;
      } else {
        api.speedLocked = false;
      }
    },

    /** Way Back — throttle/boost dead; bike holds full speed */
    lockFullSpeed() {
      api.setCruise(1);
    },

    /** Way Back — lose control but still rolling */
    startLurch() {
      api.speedLocked = false;
      api.lurching = true;
      api.tumbling = false;
      api.stalled = false;
      api.onCall = false;
      api.speed = Math.max(api.speed, BOOST_SPEED * 0.85);
      burstAnger();
    },

    /** Way Back finale — wipeout */
    startTumble() {
      api.speedLocked = false;
      api.lurching = false;
      api.tumbling = true;
      api.stalled = false;
      api.onCall = false;
      api.speed = 0;
      api.vx = 0;
      burstAnger();
    },

    /** Solid body contact — shove off a van without phasing through */
    block(nx, amount = 1) {
      // nx: push direction on X (−1 / +1), 0 = frontal wall
      if (nx !== 0) {
        group.position.x = THREE.MathUtils.clamp(
          group.position.x + nx * amount,
          -ROAD_HALF,
          ROAD_HALF,
        );
        api.vx = nx * Math.max(3.5, Math.abs(api.vx));
      }
      // Can't push through — kill forward into the obstacle
      api.speed = Math.min(api.speed, 3.2);
    },

    setX(x) {
      group.position.x = THREE.MathUtils.clamp(x, -ROAD_HALF, ROAD_HALF);
    },

    update(dt, input) {
      // --- finale lurch: still rolling, steer is forced by caller ---
      if (api.lurching) {
        api.speed = Math.max(9, api.speed - dt * 1.1);
        const speedNorm = api.speed / BOOST_SPEED;
        const grip = THREE.MathUtils.lerp(4.5, 7.2, Math.min(1, speedNorm));
        api.vx += input.steer * grip * dt * 5.5;
        api.vx *= Math.exp(-5.5 * dt);
        group.position.x = THREE.MathUtils.clamp(
          group.position.x + api.vx * dt,
          -ROAD_HALF,
          ROAD_HALF,
        );
        const steerLean = -api.vx * 0.045;
        group.rotation.z = THREE.MathUtils.damp(group.rotation.z, steerLean, 4, dt);
        group.rotation.x = THREE.MathUtils.damp(group.rotation.x, -0.08 + Math.sin(performance.now() * 0.008) * 0.06, 5, dt);
        body.rotation.z = Math.sin(performance.now() * 0.014) * 0.12;
        rider.rotation.z = Math.sin(performance.now() * 0.011) * 0.18;
        const spin = api.speed * dt * 2.2;
        frontWheel.rotation.z -= spin;
        rearWheel.rotation.z -= spin;
        trail.material.opacity = 0.15;
        headLight.intensity = 4;
        updateAnger(dt);
        syncPhoneHand(dt);
        return { forward: api.speed, boosting: false, stalled: false, lurching: true };
      }

      // --- finale tumble (slow / heavy) ---
      if (api.tumbling) {
        group.rotation.z += dt * 2.1;
        group.rotation.x += dt * 1.15;
        group.rotation.y += dt * 0.65;
        group.position.y = Math.max(-0.4, group.position.y - dt * 0.32);
        group.position.x += Math.sin(performance.now() * 0.01) * dt * 0.55;
        body.rotation.z += dt * 2.6;
        rider.rotation.z += dt * 1.5;
        trail.material.opacity = 0;
        headLight.intensity = 1.2;
        updateAnger(dt);
        syncPhoneHand(dt);
        return { forward: 0, boosting: false, stalled: false, tumbling: true };
      }

      // --- stalled: parked on the curb ---
      if (api.stalled) {
        const curb = api.parkSide * ROAD_HALF;
        group.position.x = THREE.MathUtils.damp(group.position.x, curb, 4, dt);
        group.rotation.z = THREE.MathUtils.damp(group.rotation.z, api.parkSide * 0.12, 5, dt);
        body.rotation.z = THREE.MathUtils.damp(body.rotation.z, 0, 8, dt);
        body.position.y = THREE.MathUtils.damp(body.position.y, 0, 8, dt);
        trail.material.opacity = 0;
        headLight.intensity = 3;

        updateAnger(dt);
        syncPhoneHand(dt);

        // Hold W to push off again
        if (input.throttle > 0.5) {
          api.stalled = false;
          api.speed = 4.5;
          api.vx = -api.parkSide * 2;
          api.hitCooldown = 0.35;
        }

        return { forward: 0, boosting: false, stalled: true };
      }

      if (api.handlingT >= 0) {
        api.handlingT += dt;
        if (api.handlingT >= HANDLING_TOTAL) api.handlingT = -1;
      }
      const powered = api.handlingT >= 0;
      const hMult = api.handlingMult() * api.scrapeMult();
      const scrape = api.scrapeMult();
      // Solo: hard 70% ceiling. Powerup unlocks the top of the meter.
      const soloCap = SOLO_SPEED * scrape;
      const maxSpd = powered
        ? Math.min(BOOST_SPEED, MAX_SPEED * hMult)
        : soloCap;
      const boostSpd = powered
        ? Math.min(BOOST_SPEED, BOOST_SPEED * scrape)
        : soloCap;
      const pedalAcc = PEDAL_ACCEL * hMult;
      const boostAcc = BOOST_ACCEL * (1 + (api.handlingMult() - 1) * 0.5) * scrape;

      const pedaling = input.throttle > 0;
      const braking = input.throttle < 0;
      let boosting = pedaling && input.boost && api.boostEnergy > 0.05;

      if (api.cruiseFactor > 0.05 || api.speedLocked) {
        // Gradual / full cruise — no throttle agency, steer still live
        const target = BOOST_SPEED;
        const pull = 1.1 + api.cruiseFactor * 4.5;
        api.speed += (target - api.speed) * Math.min(1, dt * pull);
        if (api.cruiseFactor > 0.35) {
          api.speed = Math.max(api.speed, target * (0.55 + api.cruiseFactor * 0.45));
        }
        if (api.speedLocked || api.cruiseFactor >= 0.98) api.speed = target;
        api.boostEnergy = 1;
        api.stalled = false;
        boosting = false;
        trail.material.opacity = 0.2 + api.cruiseFactor * 0.35;
      } else if (boosting) {
        api.boostEnergy = Math.max(0, api.boostEnergy - dt * 0.45);
        // Only accelerate up to cap — never clamp an overspeed kick downward
        if (api.speed < boostSpd) api.speed = Math.min(boostSpd, api.speed + boostAcc * dt);
        trail.material.opacity = 0.55;
      } else if (pedaling) {
        api.boostEnergy = Math.min(1, api.boostEnergy + dt * 0.18);
        if (api.speed < maxSpd) api.speed = Math.min(maxSpd, api.speed + pedalAcc * dt);
        trail.material.opacity *= Math.exp(-4 * dt);
      } else if (braking) {
        api.speed = Math.max(0, api.speed + input.throttle * 28 * dt);
        trail.material.opacity = 0;
      } else {
        // Coast — wet road eats speed fast
        api.boostEnergy = Math.min(1, api.boostEnergy + dt * 0.22);
        api.speed = Math.max(0, api.speed - COAST_DRAG * dt);
        trail.material.opacity *= Math.exp(-6 * dt);
      }

      // Over solo cap without powerup (pickup wore off) → ease back to 70%
      if (
        !api.speedLocked &&
        api.cruiseFactor < 0.05 &&
        !powered &&
        api.speed > soloCap + 0.05
      ) {
        api.speed = THREE.MathUtils.damp(api.speed, soloCap, 2.8, dt);
      } else if (
        !api.speedLocked &&
        api.cruiseFactor < 0.05 &&
        powered &&
        !pedaling &&
        !boosting &&
        api.handlingT >= HANDLING_RAMP &&
        api.speed > maxSpd
      ) {
        api.speed = THREE.MathUtils.damp(api.speed, maxSpd, 2.2, dt);
      }

      // On the phone — one hand, wet road, bad idea
      if (!api.speedLocked && api.onCall) {
        api.speed = Math.min(api.speed, 5.5);
        api.speed = Math.max(0, api.speed - 4.5 * dt);
        trail.material.opacity *= Math.exp(-8 * dt);
      }

      // Full stop → pull over
      if (!api.speedLocked && api.cruiseFactor < 0.05 && api.speed <= STOP_SPEED && !pedaling) {
        api.speed = 0;
        api.stalled = true;
        api.parkSide = group.position.x >= 0 ? 1 : -1;
        return { forward: 0, boosting: false, stalled: true };
      }

      // Steering — heavy bike, wet road; high speed turns slower
      const speedNorm = api.speed / BOOST_SPEED;
      const grip = THREE.MathUtils.lerp(3.2, 5.5, Math.min(1, speedNorm));
      api.vx += input.steer * grip * dt * 4.2;
      api.vx *= Math.exp(-8.5 * dt);
      group.position.x = THREE.MathUtils.clamp(
        group.position.x + api.vx * dt,
        -ROAD_HALF,
        ROAD_HALF,
      );

      // Pedal wobble — calm at speed, not a washing machine
      const cadence = 4.2 + api.speed * 0.12;
      if (pedaling || api.speed > 1) {
        api.pedalPhase += dt * cadence;
      }
      const wobbleAmp = pedaling
        ? 0.028 + Math.min(api.speed, MAX_SPEED) * 0.00045
        : 0.012 + Math.min(api.speed, MAX_SPEED) * 0.0003;
      const wobble = Math.sin(api.pedalPhase) * wobbleAmp;
      const bob = Math.abs(Math.sin(api.pedalPhase)) * (0.018 + api.speed * 0.00035);

      const steerLean = -api.vx * 0.028;
      group.rotation.z = THREE.MathUtils.damp(group.rotation.z, steerLean, 5, dt);
      group.rotation.x = THREE.MathUtils.damp(group.rotation.x, -api.speed * 0.0012, 6, dt);

      body.rotation.z = wobble;
      body.position.y = bob;
      body.position.x = Math.sin(api.pedalPhase) * wobbleAmp * 0.2;

      rider.rotation.z = Math.sin(api.pedalPhase) * 0.05;
      syncPhoneHand(dt);
      head.position.x = Math.sin(api.pedalPhase) * 0.015 + phoneBlend * 0.05;

      const spin = api.speed * dt * 2.2;
      frontWheel.rotation.z -= spin;
      rearWheel.rotation.z -= spin;

      if (api.hitCooldown > 0) api.hitCooldown -= dt;
      group.visible = true;
      updateAnger(dt);

      headLight.intensity = boosting ? 14 : pedaling ? 9 : 5;
      if (api.handlingMult() > 1.02) {
        const hm = api.handlingMult();
        accentMat.emissiveIntensity = 2.2 + (hm - 1) * 8;
        headLight.intensity += (hm - 1) * 16;
        trail.material.opacity = Math.max(trail.material.opacity, 0.25 + (hm - 1) * 1.2);
      } else {
        accentMat.emissiveIntensity = 2.2;
      }

      // Hard ceiling — never past the speed meter max
      api.speed = Math.min(BOOST_SPEED, Math.max(0, api.speed));

      return {
        forward: api.speed,
        boosting,
        stalled: false,
        handling: api.handlingMult() > 1.01,
        handlingMult: hMult,
      };
    },
  };

  api.reset();
  return api;
}
