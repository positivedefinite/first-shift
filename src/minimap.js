/** Climatic alley radar — top = ahead, bottom = you */

const W = 92;
const H = 220;
const LOOK_AHEAD = 70;
const LOOK_BEHIND = 8;
const ROAD_HALF = 3.35;

export function createMinimap(canvas) {
  canvas.width = W * 2;
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d');

  let rainT = 0;

  function xTo(x) {
    // map road x → canvas (center = 0)
    const u = (x / (ROAD_HALF + 0.6) + 1) * 0.5;
    return THREE_CLAMP(u, 0.08, 0.92) * W;
  }

  function zTo(z) {
    // player ~0; negative z = ahead → toward top of map
    const t = (LOOK_BEHIND - z) / (LOOK_AHEAD + LOOK_BEHIND);
    return THREE_CLAMP(1 - t, 0, 1) * H;
  }

  function draw(data) {
    const {
      playerX = 0,
      stalled = false,
      distance = 0,
      goal = 850,
      obstacles = [],
      pickups = [],
      time = 0,
      doorLabel = 'DOOR',
    } = data;

    rainT = time;
    const dpr = 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Night glass plate
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, 'rgba(18, 12, 40, 0.55)');
    bg.addColorStop(0.55, 'rgba(8, 10, 22, 0.82)');
    bg.addColorStop(1, 'rgba(4, 6, 14, 0.92)');
    roundRect(ctx, 0, 0, W, H, 14);
    ctx.fillStyle = bg;
    ctx.fill();

    // Soft neon rim
    ctx.strokeStyle = 'rgba(92, 255, 176, 0.35)';
    ctx.lineWidth = 1.2;
    roundRect(ctx, 0.5, 0.5, W - 1, H - 1, 14);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(180, 77, 255, 0.18)';
    ctx.lineWidth = 3;
    roundRect(ctx, 2, 2, W - 4, H - 4, 12);
    ctx.stroke();

    // Building canyon walls
    const wallGradL = ctx.createLinearGradient(0, 0, 18, 0);
    wallGradL.addColorStop(0, 'rgba(255, 45, 106, 0.22)');
    wallGradL.addColorStop(1, 'rgba(255, 45, 106, 0)');
    ctx.fillStyle = wallGradL;
    ctx.fillRect(0, 10, 16, H - 28);

    const wallGradR = ctx.createLinearGradient(W, 0, W - 18, 0);
    wallGradR.addColorStop(0, 'rgba(61, 224, 255, 0.2)');
    wallGradR.addColorStop(1, 'rgba(61, 224, 255, 0)');
    ctx.fillStyle = wallGradR;
    ctx.fillRect(W - 16, 10, 16, H - 28);

    // Wet road strip
    const roadX = W * 0.22;
    const roadW = W * 0.56;
    const road = ctx.createLinearGradient(0, 0, 0, H);
    road.addColorStop(0, 'rgba(30, 36, 55, 0.35)');
    road.addColorStop(1, 'rgba(20, 24, 40, 0.75)');
    ctx.fillStyle = road;
    ctx.fillRect(roadX, 12, roadW, H - 32);

    // Center dashes scrolling with distance
    ctx.strokeStyle = 'rgba(180, 200, 230, 0.28)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    const dashShift = (distance * 1.4) % 10;
    ctx.beginPath();
    ctx.moveTo(W * 0.5, 14 - dashShift);
    ctx.lineTo(W * 0.5, H - 22);
    ctx.stroke();
    ctx.setLineDash([]);

    // Fog veil toward horizon (top)
    const fog = ctx.createLinearGradient(0, 0, 0, H * 0.45);
    fog.addColorStop(0, 'rgba(42, 28, 80, 0.55)');
    fog.addColorStop(1, 'rgba(42, 28, 80, 0)');
    ctx.fillStyle = fog;
    ctx.fillRect(4, 8, W - 8, H * 0.4);

    // Rain ticks
    ctx.strokeStyle = 'rgba(180, 200, 230, 0.12)';
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 14; i++) {
      const rx = 8 + ((i * 37 + rainT * 40) % (W - 16));
      const ry = 12 + ((i * 53 + rainT * 90) % (H - 30));
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 1.5, ry + 6);
      ctx.stroke();
    }

    // Goal neon door — slides down from top as you approach
    const goalZ = -(goal - distance);
    if (goalZ > -LOOK_AHEAD - 20) {
      const gy = zTo(Math.max(goalZ, -LOOK_AHEAD));
      const pulse = 0.55 + Math.sin(time * 4) * 0.35;
      ctx.shadowColor = `rgba(92, 255, 176, ${pulse})`;
      ctx.shadowBlur = 12;
      ctx.fillStyle = `rgba(92, 255, 176, ${0.35 + pulse * 0.4})`;
      roundRect(ctx, roadX + 6, gy - 5, roadW - 12, 8, 3);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(92, 255, 176, 0.9)';
      ctx.font = '600 7px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(doorLabel, W * 0.5, gy - 8);
    } else {
      // Far marker at top
      ctx.fillStyle = 'rgba(92, 255, 176, 0.5)';
      ctx.font = '600 7px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(doorLabel, W * 0.5, 18);
      ctx.fillStyle = `rgba(92, 255, 176, ${0.4 + Math.sin(time * 3) * 0.2})`;
      ctx.beginPath();
      ctx.arc(W * 0.5, 24, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hazards
    for (const o of obstacles) {
      if (o.z > LOOK_BEHIND || o.z < -LOOK_AHEAD) continue;
      const px = xTo(o.x);
      const py = zTo(o.z);
      ctx.shadowColor = 'rgba(255, 60, 80, 0.8)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = '#ff4a5a';
      ctx.beginPath();
      ctx.moveTo(px, py - 3);
      ctx.lineTo(px + 3, py + 2.5);
      ctx.lineTo(px - 3, py + 2.5);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Coffee
    for (const p of pickups) {
      if (p.z > LOOK_BEHIND || p.z < -LOOK_AHEAD) continue;
      const px = xTo(p.x);
      const py = zTo(p.z);
      ctx.shadowColor = 'rgba(255, 179, 71, 0.9)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ffb347';
      ctx.beginPath();
      ctx.arc(px, py, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // You
    const yx = xTo(playerX);
    const yy = zTo(0);
    const youPulse = 0.65 + Math.sin(time * 6) * 0.35;
    ctx.shadowColor = stalled ? 'rgba(255, 107, 74, 0.9)' : `rgba(92, 255, 176, ${youPulse})`;
    ctx.shadowBlur = 14;
    ctx.fillStyle = stalled ? '#ff6b4a' : '#5cffb0';
    ctx.beginPath();
    ctx.moveTo(yx, yy - 5);
    ctx.lineTo(yx + 4.5, yy + 4);
    ctx.lineTo(yx - 4.5, yy + 4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ring under you
    ctx.strokeStyle = stalled ? 'rgba(255, 107, 74, 0.45)' : 'rgba(92, 255, 176, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(yx, yy + 2, 7, 3, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Label
    ctx.fillStyle = 'rgba(158, 182, 216, 0.55)';
    ctx.font = '600 7px "IBM Plex Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('ALLEY', W * 0.5, H - 8);

    // Progress ticks on right edge
    const prog = Math.min(1, distance / goal);
    ctx.fillStyle = 'rgba(61, 139, 253, 0.35)';
    ctx.fillRect(W - 5, 16, 2, H - 40);
    ctx.fillStyle = '#5cffb0';
    ctx.shadowColor = 'rgba(92, 255, 176, 0.7)';
    ctx.shadowBlur = 6;
    ctx.fillRect(W - 6, 16 + (H - 40) * (1 - prog), 4, 3);
    ctx.shadowBlur = 0;
  }

  return { draw, canvas };
}

function THREE_CLAMP(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
