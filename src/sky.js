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
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      fog: false,
    }),
  );
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

  // Smudged moon
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(6.5, 32),
    new THREE.MeshBasicMaterial({
      color: 0xd8e0ff,
      fog: false,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  moon.position.set(-28, 52, -70);
  root.add(moon);

  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(12, 32),
    new THREE.MeshBasicMaterial({
      color: 0x8899cc,
      fog: false,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  moonHalo.position.copy(moon.position);
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

  let mode = 'suburb';
  let moonRise = 0; // 0..1 — wayback rising moon ahead

  return {
    root,
    setMoonRise(p) {
      moonRise = Math.max(0, Math.min(1, p));
    },
    applyTheme(theme) {
      mode = theme.mode || 'suburb';
      moonRise = 0;
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
        moon.material.opacity = 0.95;
        moon.scale.setScalar(1.55);
        moonHalo.scale.setScalar(1.4);
        glow.material.opacity = 0.1;
        warmGlow.material.opacity = 0.12;
      } else {
        moon.material.opacity = 0.85;
        moon.scale.setScalar(1);
        moonHalo.scale.setScalar(1);
        glow.material.opacity = 0.18;
        warmGlow.material.opacity = 0.16;
        stars.material.opacity =
          mode === 'suburb' ? 0.95 : mode === 'downtown' ? 0.55 : mode === 'oldtown' ? 0.7 : 0.85;
      }
    },
    update(t, origin) {
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
        moonHalo.position.set(1.5, y, origin.z - 58);
        glow.position.x = -35;
        warmGlow.position.x = -30;
      } else {
        moon.position.set(-28, 52, origin.z - 70);
        moonHalo.position.set(-28, 52, origin.z - 70);
        glow.position.x = 0;
        warmGlow.position.x = 0;
      }

      for (const cloud of clouds.children) {
        cloud.position.x += Math.sin(t * 0.1 + cloud.position.y) * 0.01;
        cloud.position.z = origin.z - 40 - ((cloud.position.y * 0.4) % 50);
      }
    },
  };
}
