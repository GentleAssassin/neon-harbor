// Drawing only: the world and the screens in, pixels out. Smooth vector style — rounded
// shapes, soft offset shadows, a warm sunset tint — never pixel blocks. The 1280x720 view
// is scaled to fit the window and centred.
import { VIEW, WORLD, PALETTE, SCREEN_TITLE, SCREEN_PAUSED, SCREEN_OVER, SCREEN_BUSTED, SCREEN_WIN } from './config.js';
import { ROAD_W, SIDEWALK, V_ROADS, H_ROADS, BEACH_Y, SEA_Y, WATER_X, PIER, PLACES } from './city.js';
import { drawHud } from './hud.js';

export { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_BUSTED, SCREEN_WIN } from './config.js';

function rr(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (n & 255) + amount));
  return `rgb(${r},${g},${b})`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  let seaGrad = null;
  let sandGrad = null;
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / VIEW.width, height / VIEW.height);
    view.x = (width - VIEW.width * view.scale) / 2;
    view.y = (height - VIEW.height * view.scale) / 2;
    seaGrad = ctx.createLinearGradient(0, SEA_Y, 0, WORLD.height);
    seaGrad.addColorStop(0, '#2ec4b6');
    seaGrad.addColorStop(1, '#1a6f8f');
    sandGrad = ctx.createLinearGradient(0, BEACH_Y, 0, SEA_Y);
    sandGrad.addColorStop(0, '#f2d8a0');
    sandGrad.addColorStop(1, '#e8c88f');
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}:${weight || 400}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || 400} ${size}px ${PALETTE.font}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawGround(state) {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // Soft lawn variation: a few large, barely-there patches.
    ctx.fillStyle = PALETTE.grassDark;
    for (let i = 0; i < 40; i += 1) {
      const gx = ((i * 613) % WORLD.width);
      const gy = ((i * 977) % (BEACH_Y - 200)) + 100;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.ellipse(gx, gy, 180, 120, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Parks.
    for (const park of state.city.parks) {
      ctx.fillStyle = PALETTE.park;
      rr(ctx, park.x, park.y, park.w, park.h, 18);
      ctx.fill();
    }
    // Sand and sea.
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, BEACH_Y, WORLD.width, SEA_Y - BEACH_Y);
    ctx.fillStyle = '#e8c88f';
    ctx.fillRect(0, SEA_Y - 6, WORLD.width, 6);
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, SEA_Y, WORLD.width, WORLD.height - SEA_Y);
    // Gentle waves, drifting with time.
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 3;
    for (let row = 0; row < 3; row += 1) {
      const wy = SEA_Y + 40 + row * 45;
      ctx.beginPath();
      for (let x = 0; x <= WORLD.width; x += 40) {
        const y = wy + Math.sin(x / 160 + state.time * 0.8 + row * 2) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // East water.
    ctx.fillStyle = seaGrad;
    ctx.fillRect(WATER_X, 0, WORLD.width - WATER_X, BEACH_Y);
  }

  function drawRoads() {
    for (const ry of H_ROADS) {
      ctx.fillStyle = '#b8b0a4';
      rr(ctx, 0, ry - ROAD_W / 2 - SIDEWALK, WATER_X, ROAD_W + SIDEWALK * 2, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.road;
      rr(ctx, 0, ry - ROAD_W / 2, WATER_X, ROAD_W, 8);
      ctx.fill();
    }
    for (const rx of V_ROADS) {
      ctx.fillStyle = '#b8b0a4';
      rr(ctx, rx - ROAD_W / 2 - SIDEWALK, 0, ROAD_W + SIDEWALK * 2, BEACH_Y, 10);
      ctx.fill();
      ctx.fillStyle = PALETTE.road;
      rr(ctx, rx - ROAD_W / 2, 0, ROAD_W, BEACH_Y, 8);
      ctx.fill();
    }
    // Centre dashes.
    ctx.fillStyle = PALETTE.roadLine;
    for (const ry of H_ROADS) {
      for (let x = 20; x < WATER_X - 20; x += 64) ctx.fillRect(x, ry - 3, 34, 6);
    }
    for (const rx of V_ROADS) {
      for (let y = 20; y < BEACH_Y - 20; y += 64) ctx.fillRect(rx - 3, y, 6, 34);
    }
    // Crosswalk stripes at every intersection.
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (const rx of V_ROADS) {
      for (const ry of H_ROADS) {
        for (let i = -3; i <= 3; i += 1) {
          ctx.fillRect(rx + i * 11 - 3, ry - ROAD_W / 2 + 6, 6, 14);
          ctx.fillRect(rx + i * 11 - 3, ry + ROAD_W / 2 - 20, 6, 14);
        }
      }
    }
  }

  function drawPier() {
    ctx.fillStyle = '#8a6b4a';
    rr(ctx, PIER.x, PIER.y, PIER.w, PIER.h, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    for (let x = PIER.x + 24; x < PIER.x + PIER.w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, PIER.y + 4);
      ctx.lineTo(x, PIER.y + PIER.h - 4);
      ctx.stroke();
    }
    ctx.fillStyle = '#6d543a';
    for (let x = PIER.x + 10; x < PIER.x + PIER.w; x += 60) {
      ctx.beginPath();
      ctx.arc(x, PIER.y + PIER.h - 4, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBuildings(state) {
    for (const b of state.city.buildings) {
      // Soft offset shadow, then the walls, then a lighter roof with a rim.
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      rr(ctx, b.x + 8, b.y + 10, b.w, b.h, 8);
      ctx.fill();
      ctx.fillStyle = shade(b.color, -18);
      rr(ctx, b.x, b.y + 6, b.w, b.h, 8);
      ctx.fill();
      ctx.fillStyle = b.color;
      rr(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      ctx.fillStyle = shade(b.color, 26);
      rr(ctx, b.x + 8, b.y + 8, b.w - 16, b.h - 16, 6);
      ctx.fill();
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        const cols = Math.max(2, Math.floor(b.w / 34));
        const rows = Math.max(2, Math.floor(b.h / 34));
        for (let cx = 0; cx < cols; cx += 1) {
          for (let cy = 0; cy < rows; cy += 1) {
            ctx.fillRect(b.x + 14 + cx * ((b.w - 28) / cols), b.y + 14 + cy * ((b.h - 28) / rows), 10, 8);
          }
        }
      } else {
        // A skylight and two rooftop vents, so a low roof reads as a building, not a disc.
        ctx.fillStyle = 'rgba(255,255,255,0.30)';
        rr(ctx, b.x + b.w * 0.28, b.y + b.h * 0.3, b.w * 0.44, b.h * 0.4, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(b.x + 12, b.y + 12, 12, 10);
        ctx.fillRect(b.x + b.w - 24, b.y + b.h - 22, 12, 10);
      }
    }
  }

  function drawPalms(state) {
    for (const palm of state.city.palms) {
      const sway = Math.sin(state.time * 0.9 + palm.x * 0.01) * 3;
      ctx.strokeStyle = '#7a5a3a';
      ctx.lineWidth = 4 * palm.s;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y);
      ctx.quadraticCurveTo(palm.x + 4, palm.y - 16 * palm.s, palm.x + sway, palm.y - 26 * palm.s);
      ctx.stroke();
      ctx.fillStyle = PALETTE.palm;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.ellipse(palm.x + sway + Math.cos(a) * 12 * palm.s, palm.y - 26 * palm.s + Math.sin(a) * 7 * palm.s, 13 * palm.s, 5 * palm.s, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#5da24f';
      ctx.beginPath();
      ctx.arc(palm.x + sway, palm.y - 26 * palm.s, 4 * palm.s, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const u of state.city.umbrellas) {
      ctx.strokeStyle = '#8a6b4a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(u.x, u.y - 14);
      ctx.stroke();
      ctx.fillStyle = u.color;
      ctx.beginPath();
      ctx.arc(u.x, u.y - 14, 16, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(u.x, u.y - 14, 16, Math.PI * 1.25, Math.PI * 1.6);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawMarker(state) {
    const target = state.missions.target;
    if (!target) return;
    const pulse = 1 + Math.sin(state.time * 4) * 0.12;
    const x = target.x;
    const y = target.y;
    const grad = ctx.createLinearGradient(x, y - 220, x, y);
    grad.addColorStop(0, 'rgba(255,217,77,0)');
    grad.addColorStop(1, 'rgba(255,217,77,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 14, y - 220, 28, 220);
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 34 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.moveTo(x, y - 16);
    ctx.lineTo(x + 12, y);
    ctx.lineTo(x, y + 16);
    ctx.lineTo(x - 12, y);
    ctx.closePath();
    ctx.fill();
    text(target.name, x, y - 52, 15, '#ffffff', 'center', 700);
  }

  function drawCarShape(car, time) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // The player's car always reads as the player's: a gold halo beneath it.
    if (car.kind === 'player') {
      ctx.fillStyle = 'rgba(255,201,63,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 32, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    rr(ctx, -21, -9, 46, 22, 10);
    ctx.fill();
    ctx.translate(-2, -2);
    ctx.fillStyle = shade(car.color, -30);
    rr(ctx, -23, -11, 46, 22, 10);
    ctx.fill();
    ctx.fillStyle = car.color;
    rr(ctx, -23, -13, 46, 22, 10);
    ctx.fill();
    if (car.kind === 'player') {
      ctx.strokeStyle = '#ffc93f';
      ctx.lineWidth = 2;
      rr(ctx, -23, -13, 46, 22, 10);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    rr(ctx, -6, -9, 14, 18, 5);
    ctx.fill();
    ctx.fillStyle = '#1c2733';
    rr(ctx, 10, -8, 9, 16, 3);
    ctx.fill();
    ctx.fillStyle = '#fff8d6';
    ctx.beginPath();
    ctx.arc(22, -7, 3, 0, Math.PI * 2);
    ctx.arc(22, 7, 3, 0, Math.PI * 2);
    ctx.fill();
    if (car.police) {
      const on = Math.floor(time * 4) % 2 === 0;
      ctx.fillStyle = on ? '#ff3b30' : '#3b82ff';
      ctx.beginPath();
      ctx.arc(-2, -6, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = on ? '#3b82ff' : '#ff3b30';
      ctx.beginPath();
      ctx.arc(-2, 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCars(state) {
    for (const car of state.cars) drawCarShape(car, state.time);
  }

  function drawPeople(state) {
    for (const ped of state.peds) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y + 8, 9, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c9a0';
      ctx.beginPath();
      ctx.arc(ped.x + Math.cos(ped.angle) * 3, ped.y + Math.sin(ped.angle) * 3, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const thug of state.thugs) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(thug.x, thug.y + 9, 11, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d2b3d';
      ctx.beginPath();
      ctx.arc(thug.x, thug.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff4d4d';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(thug.x, thug.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f2c9a0';
      ctx.beginPath();
      ctx.arc(thug.x + Math.cos(thug.angle) * 4, thug.y + Math.sin(thug.angle) * 4, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      rr(ctx, thug.x - 16, thug.y - 26, 32, 6, 3);
      ctx.fill();
      ctx.fillStyle = '#ff4d4d';
      rr(ctx, thug.x - 15, thug.y - 25, 30 * Math.max(0, thug.health / 60), 4, 2);
      ctx.fill();
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    if (player.inCar) return; // the car is drawn by drawCars
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 10, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const blink = player.invuln > 0 && Math.floor(player.invuln * 12) % 2 === 0;
    if (blink) return;
    ctx.fillStyle = '#ffcf3f';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#2b2b3d';
    ctx.beginPath();
    ctx.arc(player.x + Math.cos(player.angle) * 5, player.y + Math.sin(player.angle) * 5, 5, 0, Math.PI * 2);
    ctx.fill();
    if (player.weapon === 'pistol') {
      ctx.strokeStyle = '#2b2b3d';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(player.x + Math.cos(player.aimAngle) * 10, player.y + Math.sin(player.aimAngle) * 10);
      ctx.lineTo(player.x + Math.cos(player.aimAngle) * 22, player.y + Math.sin(player.aimAngle) * 22);
      ctx.stroke();
    }
  }

  function drawBullets(state) {
    for (const b of state.bullets) {
      ctx.strokeStyle = 'rgba(255,230,109,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = '#ffe66d';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPickups(state) {
    for (const p of state.pickups) {
      const bob = Math.sin(state.time * 3 + p.x) * 3;
      if (p.kind === 'cash') {
        ctx.fillStyle = '#2ec4b6';
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 12, 0, Math.PI * 2);
        ctx.stroke();
        text('$', p.x, p.y + bob + 5, 15, '#ffffff', 'center', 800);
      } else if (p.kind === 'ammo') {
        ctx.fillStyle = '#ff9f68';
        rr(ctx, p.x - 10, p.y + bob - 10, 20, 20, 5);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - 2, p.y + bob - 6, 4, 12);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y + bob, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff4d4d';
        ctx.fillRect(p.x - 2, p.y + bob - 7, 4, 14);
        ctx.fillRect(p.x - 7, p.y + bob - 2, 14, 4);
      }
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of state.floating) {
      ctx.globalAlpha = Math.max(0, f.t / 1.2);
      text(f.text, f.x, f.y, 20, f.color, 'center', 800);
    }
    ctx.globalAlpha = 1;
  }

  function drawWorld(state) {
    const camX = state.camera.x - VIEW.width / 2;
    const camY = state.camera.y - VIEW.height / 2;
    ctx.save();
    ctx.translate(-camX, -camY);
    drawGround(state);
    drawRoads();
    drawPier();
    drawBuildings(state);
    drawPalms(state);
    drawMarker(state);
    drawPickups(state);
    drawCars(state);
    drawPeople(state);
    drawPlayer(state);
    drawBullets(state);
    drawParticles(state);
    ctx.restore();
    // Warm sunset tint and soft edge vignette, screen space.
    const tint = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    tint.addColorStop(0, 'rgba(255,120,80,0.05)');
    tint.addColorStop(1, 'rgba(255,170,90,0.10)');
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    if (state.wanted > 0) {
      const pulse = 0.06 + 0.03 * Math.sin(state.time * 5);
      const vig = ctx.createRadialGradient(640, 360, 300, 640, 360, 720);
      vig.addColorStop(0, 'rgba(255,40,40,0)');
      vig.addColorStop(1, `rgba(255,40,40,${pulse * state.wanted})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    if (state.player.health < 35 && state.player.health > 0) {
      const vig = ctx.createRadialGradient(640, 360, 280, 640, 360, 700);
      vig.addColorStop(0, 'rgba(180,0,0,0)');
      vig.addColorStop(1, 'rgba(180,0,0,0.35)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
  }

  /** Paint one frame: the world, then the HUD or a screen panel over it. */
  function draw(state, screen, meta) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a1b41';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWorld(state);
    drawHud(ctx, state, screen, meta, text, rr);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
