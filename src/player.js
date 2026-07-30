import * as THREE from 'three/webgpu';

const ROAD_HALF = 3.35;
const MAX_SPEED = 20;
const BOOST_SPEED = 26;
const STOP_SPEED = 0.35;
const COAST_DRAG = 7.5;
const PEDAL_ACCEL = 8.5;
const BOOST_ACCEL = 13;
const ANGER_COUNT = 10;
/** Good handling pickup: ramp +25% over 1s, ease back over 3s */
const HANDLING_PEAK = 1.25;
const HANDLING_RAMP = 1;
const HANDLING_FALL = 3;
const HANDLING_TOTAL = HANDLING_RAMP + HANDLING_FALL;

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
    handlingT: -1, // <0 inactive; else seconds into envelope
    onCall: false, // girlfriend call — forced slow

    // world.js still reads this name for brief post-hit grace
    get invuln() {
      return api.hitCooldown;
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
      group.position.set(0, 0, 0);
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
      trail.material.opacity = 0;
      group.visible = true;
      rider.rotation.z = 0;
      head.position.x = 0;
      for (const bit of angerBits) {
        bit.life = 0;
        bit.mesh.visible = false;
      }
    },

    /** Start / refresh good-handling speed envelope */
    goodHandling() {
      api.handlingT = 0;
    },

    punish() {
      api.speed *= 0.4;
      api.hitCooldown = 0.7; // grace only — no blink
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
      const hMult = api.handlingMult();
      const maxSpd = MAX_SPEED * hMult;
      const boostSpd = BOOST_SPEED * hMult;
      const pedalAcc = PEDAL_ACCEL * hMult;
      const boostAcc = BOOST_ACCEL * hMult;

      const pedaling = input.throttle > 0;
      const braking = input.throttle < 0;
      const boosting = pedaling && input.boost && api.boostEnergy > 0.05;

      if (boosting) {
        api.boostEnergy = Math.max(0, api.boostEnergy - dt * 0.45);
        api.speed = Math.min(boostSpd, api.speed + boostAcc * dt);
        trail.material.opacity = 0.55;
      } else if (pedaling) {
        api.boostEnergy = Math.min(1, api.boostEnergy + dt * 0.18);
        api.speed = Math.min(maxSpd, api.speed + pedalAcc * dt);
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

      // While handling fades, ease speed down with the shrinking cap
      if (api.handlingT >= HANDLING_RAMP && api.speed > maxSpd) {
        api.speed = THREE.MathUtils.damp(api.speed, maxSpd, 5, dt);
      }

      // On the phone — one hand, wet road, bad idea
      if (api.onCall) {
        api.speed = Math.min(api.speed, 5.5);
        api.speed = Math.max(0, api.speed - 4.5 * dt);
        trail.material.opacity *= Math.exp(-8 * dt);
      }

      // Full stop → pull over
      if (api.speed <= STOP_SPEED && !pedaling) {
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
      head.position.x = Math.sin(api.pedalPhase) * 0.015;

      const spin = api.speed * dt * 2.2;
      frontWheel.rotation.z -= spin;
      rearWheel.rotation.z -= spin;

      if (api.hitCooldown > 0) api.hitCooldown -= dt;
      group.visible = true;
      updateAnger(dt);

      headLight.intensity = boosting ? 14 : pedaling ? 9 : 5;
      if (hMult > 1.02) {
        accentMat.emissiveIntensity = 2.2 + (hMult - 1) * 8;
        headLight.intensity += (hMult - 1) * 16;
        trail.material.opacity = Math.max(trail.material.opacity, 0.25 + (hMult - 1) * 1.2);
      } else {
        accentMat.emissiveIntensity = 2.2;
      }

      return {
        forward: api.speed,
        boosting,
        stalled: false,
        handling: hMult > 1.01,
        handlingMult: hMult,
      };
    },
  };

  api.reset();
  return api;
}
