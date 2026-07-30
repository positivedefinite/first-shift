import * as THREE from 'three/webgpu';

const COUNT = 900;

export function createRain(scene) {
  // Short streaks, not starfield dots
  const positions = new Float32Array(COUNT * 6);
  const speeds = new Float32Array(COUNT);
  const bases = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const x = (Math.random() - 0.5) * 36;
    const y = Math.random() * 20;
    const z = -Math.random() * 70;
    bases[i * 3] = x;
    bases[i * 3 + 1] = y;
    bases[i * 3 + 2] = z;
    speeds[i] = 16 + Math.random() * 22;
    const len = 0.35 + Math.random() * 0.55;
    positions[i * 6] = x;
    positions[i * 6 + 1] = y;
    positions[i * 6 + 2] = z;
    positions[i * 6 + 3] = x + 0.04;
    positions[i * 6 + 4] = y - len;
    positions[i * 6 + 5] = z + 0.12;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const mat = new THREE.LineBasicMaterial({
    color: 0x9eb6d8,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const lines = new THREE.LineSegments(geo, mat);
  scene.add(lines);

  return {
    setOpacity(v) {
      mat.opacity = v;
    },
    update(dt, origin, speed) {
      const arr = geo.attributes.position.array;
      const wind = 1.2 + speed * 0.08;

      for (let i = 0; i < COUNT; i++) {
        let x = bases[i * 3];
        let y = bases[i * 3 + 1];
        let z = bases[i * 3 + 2];

        y -= speeds[i] * dt;
        z += wind * dt * 0.4;
        x += 0.35 * dt;

        if (y < 0) {
          x = origin.x + (Math.random() - 0.5) * 32;
          y = 10 + Math.random() * 12;
          z = origin.z - 6 - Math.random() * 60;
        }

        bases[i * 3] = x;
        bases[i * 3 + 1] = y;
        bases[i * 3 + 2] = z;

        const len = 0.4 + (speeds[i] / 40) * 0.5;
        const ix = i * 6;
        arr[ix] = x;
        arr[ix + 1] = y;
        arr[ix + 2] = z;
        arr[ix + 3] = x + 0.05;
        arr[ix + 4] = y - len;
        arr[ix + 5] = z + 0.15;
      }

      geo.attributes.position.needsUpdate = true;
    },
  };
}
