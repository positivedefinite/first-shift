import * as THREE from 'three/webgpu';

function makeSkyTexture(stops) {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  const list = stops || [
    [0, '#040510'],
    [0.45, '#181448'],
    [0.9, '#8a5a78'],
    [1, '#c08070'],
  ];
  for (const [t, col] of list) grad.addColorStop(t, col);
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 512);

  g.globalAlpha = 0.2;
  for (let i = 0; i < 14; i++) {
    const y = 400 + Math.random() * 100;
    g.fillStyle = i % 2 ? '#4a2a90' : '#7a4058';
    g.beginPath();
    g.ellipse(4, y, 8, 20 + Math.random() * 24, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function makeStarField(count = 1200) {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.05 + Math.random() * 0.92);
    const r = 145;
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = Math.abs(r * Math.cos(phi));
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

    const cool = Math.random() > 0.65;
    const b = 0.6 + Math.random() * 0.4;
    colors[i * 3] = cool ? b * 0.7 : b;
    colors[i * 3 + 1] = cool ? b * 0.85 : b * 0.92;
    colors[i * 3 + 2] = b;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      fog: false,
    }),
  );
  stars.renderOrder = 0;
  return stars;
}

export function createSky(scene) {
  const root = new THREE.Group();
  root.name = 'sky';
  scene.add(root);

  let domeMap = makeSkyTexture();
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(155, 48, 32),
    new THREE.MeshBasicMaterial({
      map: domeMap,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    }),
  );
  root.add(dome);

  // Big backdrop plate — fills the chase-cam sky gap above the canyon
  let plateMap = makeSkyTexture();
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(260, 120),
    new THREE.MeshBasicMaterial({
      map: plateMap,
      fog: false,
      depthWrite: false,
    }),
  );
  plate.position.set(0, 42, -80);
  root.add(plate);

  const stars = makeStarField(1200);
  root.add(stars);

  // Small pale moon — hint of warm, not blood-red
  function makeMoonTexture() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(50, 46, 6, 64, 64, 62);
    grad.addColorStop(0, '#f4f0e8');
    grad.addColorStop(0.4, '#e4d8c8');
    grad.addColorStop(0.75, '#c8b8a8');
    grad.addColorStop(1, '#8a7868');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(64, 64, 62, 0, Math.PI * 2);
    g.fill();
    // Soft craters
    g.fillStyle = 'rgba(90, 80, 70, 0.28)';
    for (const [x, y, r] of [
      [44, 50, 9],
      [78, 58, 6],
      [58, 78, 11],
      [70, 40, 4],
      [38, 72, 5],
    ]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    // Soft terminator
    const shade = g.createLinearGradient(18, 0, 112, 0);
    shade.addColorStop(0, 'rgba(30, 28, 40, 0.4)');
    shade.addColorStop(0.5, 'rgba(30, 28, 40, 0)');
    shade.addColorStop(1, 'rgba(255, 245, 230, 0.1)');
    g.fillStyle = shade;
    g.beginPath();
    g.arc(64, 64, 62, 0, Math.PI * 2);
    g.fill();
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const moonMap = makeMoonTexture();
  // Opaque body so stars never show through
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(2.15, 40),
    new THREE.MeshBasicMaterial({
      map: moonMap,
      fog: false,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    }),
  );
  moon.position.set(-28, 52, -70);
  moon.renderOrder = 2;
  root.add(moon);

  // Big soft cool halo (the nicer one) — behind/around, not punching holes
  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(5.8, 32),
    new THREE.MeshBasicMaterial({
      color: 0x8899cc,
      fog: false,
      transparent: true,
      opacity: 0.14,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,
    }),
  );
  moonHalo.position.copy(moon.position);
  moonHalo.position.z -= 0.15; // slightly behind the disc
  moonHalo.renderOrder = 1;
  root.add(moonHalo);

  // Horizon city glow
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 18),
    new THREE.MeshBasicMaterial({
      color: 0x6a3cff,
      transparent: true,
      opacity: 0.18,
      fog: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  glow.position.set(0, 8, -78);
  root.add(glow);

  const warmGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(180, 14),
    new THREE.MeshBasicMaterial({
      color: 0xff6a3a,
      transparent: true,
      opacity: 0.16,
      fog: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  warmGlow.position.set(0, 4, -76);
  root.add(warmGlow);

  // Distant skyline silhouettes on the plate
  const skylineMat = new THREE.MeshBasicMaterial({
    color: 0x080a14,
    fog: false,
  });
  const skyline = new THREE.Group();
  skyline.position.z = -74;
  for (let i = 0; i < 42; i++) {
    const h = 6 + Math.random() * 32;
    const w = 2.2 + Math.random() * 5;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2), skylineMat);
    tower.position.set(-70 + i * 3.5 + Math.random() * 1.2, h * 0.5 - 2, Math.random() * 4);
    skyline.add(tower);

    if (Math.random() > 0.5) {
      const tip = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.85, 0.35, 2.1),
        new THREE.MeshBasicMaterial({
          color: Math.random() > 0.5 ? 0xff2d6a : 0x3de0ff,
          fog: false,
        }),
      );
      tip.position.y = h * 0.5 + 0.1;
      tower.add(tip);
    }
  }
  root.add(skyline);

  // Soft cloud sheets
  const clouds = new THREE.Group();
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0x2a2048,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    fog: false,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 10; i++) {
    const cloud = new THREE.Mesh(
      new THREE.PlaneGeometry(35 + Math.random() * 45, 5 + Math.random() * 8),
      cloudMat.clone(),
    );
    cloud.position.set((Math.random() - 0.5) * 120, 35 + Math.random() * 40, -40 - Math.random() * 50);
    cloud.rotation.z = (Math.random() - 0.5) * 0.3;
    cloud.userData.speed = 0.8 + Math.random() * 1.2;
    clouds.add(cloud);
  }
  root.add(clouds);

  // Falling stars / meteors — Way Back only, intensity-driven
  const METEOR_MAX = 48;
  const meteorPos = new Float32Array(METEOR_MAX * 6);
  const meteorGeo = new THREE.BufferGeometry();
  meteorGeo.setAttribute('position', new THREE.BufferAttribute(meteorPos, 3));
  meteorGeo.setDrawRange(0, 0);
  const meteorMat = new THREE.LineBasicMaterial({
    color: 0xfff2d0,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const meteorLines = new THREE.LineSegments(meteorGeo, meteorMat);
  meteorLines.visible = false;
  root.add(meteorLines);

  /** @type {{ x:number,y:number,z:number, vx:number,vy:number,vz:number, life:number, max:number, len:number }[]} */
  const meteors = [];
  let meteorIntensity = 0; // 0 none · 1 one · 2 few · 3 clusters
  let meteorProximity = 0; // 0 far sky · 1 screaming past the bridge
  let meteorCooldown = 0;
  let singleSpent = false;

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function spawnMeteor(cluster = false) {
    if (meteors.length >= METEOR_MAX) return;
    const near = meteorProximity;
    const side = Math.random() > 0.28 ? -1 : 1; // bias left
    // Far: high & distant. Near: low, close, almost in your face.
    const xSpan = lerp(52, 9, near);
    const x = side * (lerp(22, 5, near) + Math.random() * xSpan) + (cluster ? (Math.random() - 0.5) * lerp(20, 6, near) : 0);
    const y = lerp(62, 11, near) + Math.random() * lerp(36, 10, near);
    const z = lerp(-85, -8, near) - Math.random() * lerp(45, 10, near);
    const speed = lerp(22, 48, near) + Math.random() * lerp(20, 40, near);
    meteors.push({
      x,
      y,
      z,
      vx: -side * lerp(6, 18, near) + (Math.random() - 0.5) * 4,
      vy: -speed * (0.55 + Math.random() * 0.35),
      vz: lerp(4, 16, near) + Math.random() * 8,
      life: lerp(1.1, 0.55, near) + Math.random() * 0.5,
      max: 1,
      len: lerp(2.0, 6.5, near) + Math.random() * lerp(1.5, 3, near),
    });
  }

  function updateMeteors(dt, origin) {
    if (mode !== 'wayback' || meteorIntensity <= 0) {
      meteorGeo.setDrawRange(0, 0);
      meteorLines.visible = false;
      return;
    }
    meteorLines.visible = true;
    meteorCooldown -= dt;

    if (meteorIntensity === 1) {
      // Exactly one over the early stretch
      if (!singleSpent && meteorCooldown <= 0) {
        spawnMeteor(false);
        singleSpent = true;
        meteorCooldown = 99;
      }
    } else if (meteorIntensity === 2) {
      if (meteorCooldown <= 0) {
        spawnMeteor(false);
        if (Math.random() < 0.35) spawnMeteor(false);
        meteorCooldown = 1.4 + Math.random() * 1.8;
      }
    } else if (meteorIntensity >= 3) {
      if (meteorCooldown <= 0) {
        const n = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < n; i++) spawnMeteor(true);
        meteorCooldown = 0.35 + Math.random() * 0.55;
      }
    }

    let draw = 0;
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.life -= dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;
      if (m.life <= 0 || m.y < 8) {
        meteors.splice(i, 1);
        continue;
      }
      const ox = origin.x * 0.1;
      const oz = origin.z;
      const ix = draw * 6;
      meteorPos[ix] = m.x + ox;
      meteorPos[ix + 1] = m.y;
      meteorPos[ix + 2] = m.z + oz;
      meteorPos[ix + 3] = m.x + ox - m.vx * 0.04 * m.len;
      meteorPos[ix + 4] = m.y - m.vy * 0.04 * m.len;
      meteorPos[ix + 5] = m.z + oz - m.vz * 0.04 * m.len;
      draw++;
    }
    meteorGeo.attributes.position.needsUpdate = true;
    meteorGeo.setDrawRange(0, draw * 2);
    meteorMat.opacity = 0.5 + meteorIntensity * 0.1 + meteorProximity * 0.25;
  }

  let mode = 'suburb';
  let moonRise = 0; // 0..1 — wayback rising moon ahead

  return {
    root,
    setMoonRise(p) {
      moonRise = Math.max(0, Math.min(1, p));
    },
    /** 0 none · 1 single · 2 few · 3 clusters */
    setMeteorIntensity(level) {
      const next = Math.max(0, Math.min(3, level | 0));
      if (next !== meteorIntensity) {
        meteorIntensity = next;
        meteorCooldown = next === 1 ? 1.2 + Math.random() * 2 : 0.2;
        if (next <= 1) singleSpent = false;
        if (next === 0) meteors.length = 0;
      }
    },
    /** 0 far horizon streaks · 1 nearly overhead */
    setMeteorProximity(p) {
      meteorProximity = Math.max(0, Math.min(1, p));
    },
    applyTheme(theme) {
      mode = theme.mode || 'suburb';
      moonRise = 0;
      meteorIntensity = 0;
      meteorProximity = 0;
      meteors.length = 0;
      singleSpent = false;
      meteorCooldown = 0;
      meteorLines.visible = false;
      meteorGeo.setDrawRange(0, 0);
      if (domeMap) domeMap.dispose();
      if (plateMap) plateMap.dispose();
      domeMap = makeSkyTexture(theme.skyStops);
      plateMap = makeSkyTexture(theme.skyStops);
      dome.material.map = domeMap;
      dome.material.needsUpdate = true;
      plate.material.map = plateMap;
      plate.material.needsUpdate = true;
      glow.material.color.setHex(theme.glowColor);
      warmGlow.material.color.setHex(theme.warmGlow);
      skyline.visible = (theme.skylineDensity || 0) > 0.2;
      skyline.scale.set(1, 0.5 + (theme.skylineDensity || 0) * 0.8, 1);
      clouds.visible = mode !== 'wayback';
      if (mode === 'wayback') {
        stars.material.opacity = 1;
        moon.material.opacity = 0.94;
        moon.scale.setScalar(1.05);
        moonHalo.scale.setScalar(1.35);
        moonHalo.material.color.setHex(0x8899cc);
        moonHalo.material.opacity = 0.16;
        glow.material.opacity = 0.1;
        warmGlow.material.opacity = 0.12;
      } else {
        moon.material.opacity = 0.88;
        moon.scale.setScalar(0.85);
        moonHalo.scale.setScalar(1.1);
        moonHalo.material.color.setHex(0x8899cc);
        moonHalo.material.opacity = 0.12;
        glow.material.opacity = 0.18;
        warmGlow.material.opacity = 0.16;
        stars.material.opacity =
          mode === 'suburb' ? 0.95 : mode === 'downtown' ? 0.55 : mode === 'oldtown' ? 0.7 : 0.85;
      }
    },
    update(t, origin, dt = 0.016) {
      root.position.x = origin.x * 0.1;
      plate.position.z = origin.z - 80;
      glow.position.z = origin.z - 78;
      warmGlow.position.z = origin.z - 76;
      skyline.position.z = origin.z - 74;
      stars.rotation.y = t * 0.01;

      if (mode === 'wayback') {
        // Moon rises dead ahead as you cross the span
        const y = 14 + moonRise * 42;
        moon.position.set(1.5, y, origin.z - 58);
        moonHalo.position.set(1.5, y, origin.z - 58.2);
        glow.position.x = -35;
        warmGlow.position.x = -30;
      } else {
        moon.position.set(-28, 52, origin.z - 70);
        moonHalo.position.set(-28, 52, origin.z - 70.2);
        glow.position.x = 0;
        warmGlow.position.x = 0;
      }

      for (const cloud of clouds.children) {
        cloud.position.x += Math.sin(t * 0.1 + cloud.position.y) * 0.01;
        cloud.position.z = origin.z - 40 - ((cloud.position.y * 0.4) % 50);
      }

      updateMeteors(Math.min(0.05, dt), origin);
    },
  };
}
