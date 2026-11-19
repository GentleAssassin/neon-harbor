// The HUD, in the modern open-world style: thin bars, rounded glass panels, a rounded
// minimap with a pink route line, and only what the moment needs. Stars, ammo and the
// objective fade in when they matter; the world stays the star of the screen.
import { VIEW, WORLD, PALETTE, SCREEN_TITLE, SCREEN_PAUSED, SCREEN_OVER, SCREEN_BUSTED, SCREEN_WIN } from './config.js';
import { ROAD_W, SIDEWALK, V_ROADS, H_ROADS, BEACH_Y, SEA_Y, WATER_X, PIER } from './city.js';
import { currentObjective, currentMissionTitle, missionCount } from './missions.js';

const GLASS = 'rgba(16,14,26,0.78)';
const GLASS_BORDER = 'rgba(255,255,255,0.16)';
const MAP_W = 232;
const MAP_H = 172;

function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.2, y, x - s * 0.6, y - s, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.6, y - s, x + s * 1.2, y, x, y + s * 0.9);
  ctx.closePath();
}

function panel(ctx, rr, x, y, w, h, r) {
  ctx.fillStyle = GLASS;
  rr(ctx, x, y, w, h, r || 16);
  ctx.fill();
  ctx.strokeStyle = GLASS_BORDER;
  ctx.lineWidth = 1;
  ctx.stroke();
}

export function drawHud(ctx, state, screen, meta, text, rr) {
  const player = state.player;
  const showPlay = screen === 'play';

  if (showPlay || screen === SCREEN_PAUSED) {
    // Top-left: health bar with a heart, cash beneath it.
    const healthColor = player.health > 50 ? '#58d68d' : player.health > 25 ? '#ffc93f' : '#ff4d4d';
    panel(ctx, rr, 20, 20, 250, 64, 14);
    ctx.fillStyle = '#ff6b81';
    heartPath(ctx, 44, 34, 9);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    rr(ctx, 60, 30, 196, 12, 6);
    ctx.fill();
    ctx.fillStyle = healthColor;
    rr(ctx, 60, 30, 196 * Math.max(0, player.health / 100), 12, 6);
    ctx.fill();
    text(`$${player.cash.toLocaleString('en-US')}`, 60, 68, 20, PALETTE.gold, 'left', 800);

    // Top-right: wanted stars, then weapon and ammo.
    panel(ctx, rr, VIEW.width - 250, 20, 230, 64, 14);
    for (let i = 0; i < 5; i += 1) {
      const x = VIEW.width - 228 + i * 34;
      const y = 40;
      if (i < state.wanted) {
        ctx.fillStyle = state.wanted >= 5 && Math.floor(state.time * 4) % 2 === 0 ? '#ff4d4d' : PALETTE.star;
        starPath(ctx, x, y, 11);
        ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        starPath(ctx, x, y, 11);
        ctx.stroke();
      }
    }
    const weaponName = player.weapon === 'pistol' ? 'Pistol' : 'Fists';
    const ammoText = player.weapon === 'pistol' ? `${player.mag} / ${player.reserve}` : '—';
    text(`${weaponName}   ${ammoText}`, VIEW.width - 36, 68, 17, PALETTE.hudText, 'right', 700);

    // Top-centre: the mission card.
    const objective = currentObjective(state);
    if (objective) {
      const cardW = 470;
      panel(ctx, rr, (VIEW.width - cardW) / 2, 20, cardW, 62, 14);
      text(`Mission ${Math.min(state.missions.index + 1, missionCount())} of ${missionCount()} — ${currentMissionTitle(state)}`, VIEW.width / 2, 42, 13, PALETTE.hudMuted, 'center', 600);
      let objText = objective;
      if (state.missions.timer > 0) objText += `   ·   ${Math.ceil(state.missions.timer)}s`;
      text(objText, VIEW.width / 2, 66, 17, PALETTE.hudText, 'center', 700);
    }

    drawMinimap(ctx, state, rr, text);

    // Bottom-right: speed, only behind the wheel.
    if (player.inCar && player.car) {
      const kmh = Math.round(Math.abs(player.car.speed) * 0.32);
      panel(ctx, rr, VIEW.width - 150, VIEW.height - 84, 130, 64, 14);
      text(String(kmh), VIEW.width - 36, VIEW.height - 34, 34, PALETTE.hudText, 'right', 800);
      text('km/h', VIEW.width - 100, VIEW.height - 34, 14, PALETTE.hudMuted, 'right', 600);
    }

    // Crosshair, only on foot with the pistol out.
    if (!player.inCar && player.weapon === 'pistol' && meta.mouse) {
      const mx = meta.mouse.x;
      const my = meta.mouse.y;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ff6b4a';
      ctx.beginPath();
      ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Arrest progress, dead centre.
    if (state.arrestTimer > 0) {
      panel(ctx, rr, VIEW.width / 2 - 160, VIEW.height / 2 - 90, 320, 54, 14);
      text('The police are arresting you!', VIEW.width / 2, VIEW.height / 2 - 66, 16, '#ff8a80', 'center', 700);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      rr(ctx, VIEW.width / 2 - 140, VIEW.height / 2 - 52, 280, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#ff4d4d';
      rr(ctx, VIEW.width / 2 - 140, VIEW.height / 2 - 52, 280 * Math.min(1, state.arrestTimer / 1.4), 8, 4);
      ctx.fill();
    }

    // Toasts and dialogue, bottom centre. Toasts stack upward clear of the prompt.
    let toastY = VIEW.height - 244;
    for (const m of state.messages) {
      ctx.globalAlpha = Math.min(1, m.t);
      text(m.text, VIEW.width / 2, toastY, 16, '#ffffff', 'center', 600);
      ctx.globalAlpha = 1;
      toastY -= 24;
    }
    if (state.dialogue) {
      panel(ctx, rr, VIEW.width / 2 - 320, VIEW.height - 168, 640, 84, 16);
      text(state.dialogue.name, VIEW.width / 2 - 296, VIEW.height - 134, 14, PALETTE.accent, 'left', 800);
      text(state.dialogue.text, VIEW.width / 2 - 296, VIEW.height - 106, 16, PALETTE.hudText, 'left', 500);
    }

    // Contextual prompt above the dialogue.
    const prompt = contextualPrompt(state);
    if (prompt) {
      text(prompt, VIEW.width / 2, VIEW.height - 186, 16, '#ffffff', 'center', 700);
    }
    if (state.time < 9) {
      text('WASD move · E get in a car · Click shoot · F punch · R reload · P pause · M mute', VIEW.width / 2, 108, 15, 'rgba(255,255,255,0.85)', 'center', 600);
    }
  }

  if (screen === SCREEN_TITLE) drawTitle(ctx, state, meta, text, rr);
  else if (screen === SCREEN_PAUSED) drawPanelScreen(ctx, 'Paused', ['The city waits for you.'], 'Press P to keep playing', text, rr);
  else if (screen === SCREEN_OVER) {
    drawPanelScreen(ctx, 'Kai is down', [`Cash kept: $${player.cash.toLocaleString('en-US')}`, `Missions done: ${state.missions.done} of ${missionCount()}`], 'Press Enter to try again', text, rr);
  } else if (screen === SCREEN_BUSTED) {
    drawPanelScreen(ctx, 'Busted', [`The police took $${100} and let you go.`, `Missions done: ${state.missions.done} of ${missionCount()}`], 'Press Enter to get back out there', text, rr);
  } else if (screen === SCREEN_WIN) {
    drawPanelScreen(ctx, 'Neon Harbor is yours', [`All ${missionCount()} missions complete.`, `Cash earned: $${player.cash.toLocaleString('en-US')}`, `Best cash: $${(meta.best || 0).toLocaleString('en-US')}`], 'Press Enter to play it again', text, rr);
  }
}

function contextualPrompt(state) {
  const player = state.player;
  if (player.inCar) return 'E — Get out of the car';
  let nearest = null;
  let best = 56;
  for (const car of state.cars) {
    if (car.kind === 'player') continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < best) {
      best = d;
      nearest = car;
    }
  }
  if (nearest) return nearest.police ? 'That is a police car — find another ride' : 'E — Get in the car';
  return '';
}

function drawMinimap(ctx, state, rr, text) {
  const x0 = 20;
  const y0 = VIEW.height - MAP_H - 20;
  const scale = MAP_W / WORLD.width;
  const mh = WORLD.height * scale;
  let label = '';
  ctx.save();
  panel(ctx, rr, x0, y0, MAP_W, MAP_H, 16);
  rr(ctx, x0, y0, MAP_W, MAP_H, 16);
  ctx.clip();
  ctx.fillStyle = '#7fae62';
  ctx.fillRect(x0, y0, MAP_W, mh);
  ctx.fillStyle = '#2ec4b6';
  ctx.fillRect(x0, y0 + SEA_Y * scale, MAP_W, (WORLD.height - SEA_Y) * scale);
  ctx.fillRect(x0 + WATER_X * scale, y0, MAP_W - WATER_X * scale, BEACH_Y * scale);
  ctx.fillStyle = '#e8cf9a';
  ctx.fillRect(x0, y0 + BEACH_Y * scale, MAP_W, (SEA_Y - BEACH_Y) * scale);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 3;
  for (const rx of V_ROADS) {
    ctx.beginPath();
    ctx.moveTo(x0 + rx * scale, y0);
    ctx.lineTo(x0 + rx * scale, y0 + BEACH_Y * scale);
    ctx.stroke();
  }
  for (const ry of H_ROADS) {
    ctx.beginPath();
    ctx.moveTo(x0, y0 + ry * scale);
    ctx.lineTo(x0 + WATER_X * scale, y0 + ry * scale);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(40,40,60,0.5)';
  for (const b of state.city.buildings) {
    ctx.fillRect(x0 + b.x * scale, y0 + b.y * scale, Math.max(2, b.w * scale), Math.max(2, b.h * scale));
  }
  // GPS route: a pink line from the player to the mission target.
  const target = state.missions.target;
  const px = x0 + state.player.x * scale;
  const py = y0 + state.player.y * scale;
  if (target) {
    ctx.strokeStyle = '#ff5c8a';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x0 + target.x * scale, y0 + target.y * scale);
    ctx.stroke();
    ctx.setLineDash([]);
    const pulse = 1 + Math.sin(state.time * 4) * 0.2;
    ctx.fillStyle = '#ffd94d';
    starPath(ctx, x0 + target.x * scale, y0 + target.y * scale, 7 * pulse);
    ctx.fill();
    const distM = Math.round((Math.hypot(target.x - state.player.x, target.y - state.player.y) * 0.5));
    label = `${target.name} · ${distM} m`;
  }
  for (const car of state.cars) {
    if (car.kind !== 'police') continue;
    ctx.fillStyle = '#ff3b30';
    ctx.beginPath();
    ctx.arc(x0 + car.x * scale, y0 + car.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#1a1b41';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.restore();
  // Outside the clip: the distance label above the map, and the compass mark tucked
  // inside the map's bottom-right corner so neither is ever cut off.
  if (label) text(label, x0 + 2, y0 - 8, 13, '#ffffff', 'left', 700);
  text('N', x0 + MAP_W - 12, y0 + MAP_H - 8, 13, 'rgba(255,255,255,0.9)', 'center', 700);
}

function drawPanelScreen(ctx, title, lines, prompt, text, rr) {
  ctx.fillStyle = 'rgba(10,10,24,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 620;
  const h = 200 + lines.length * 36;
  const x = (VIEW.width - w) / 2;
  const y = (VIEW.height - h) / 2;
  panel(ctx, rr, x, y, w, h, 20);
  text(title, VIEW.width / 2, y + 84, 46, '#ffffff', 'center', 800);
  for (let i = 0; i < lines.length; i += 1) {
    text(lines[i], VIEW.width / 2, y + 134 + i * 36, 19, PALETTE.hudMuted, 'center', 500);
  }
  text(prompt, VIEW.width / 2, y + h - 36, 18, PALETTE.gold, 'center', 700);
}

function drawTitle(ctx, state, meta, text, rr) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, 'rgba(26,27,65,0.25)');
  grad.addColorStop(0.55, 'rgba(255,71,126,0.18)');
  grad.addColorStop(1, 'rgba(26,27,65,0.72)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.save();
  ctx.shadowColor = 'rgba(255,120,80,0.8)';
  ctx.shadowBlur = 42;
  text('NEON HARBOR', VIEW.width / 2, 250, 84, '#ffffff', 'center', 800);
  ctx.restore();
  text('A sun-soaked open-world crime story', VIEW.width / 2, 296, 24, '#ffe66d', 'center', 600);
  text('Steal cars. Outrun the police. Finish the five jobs and own the city.', VIEW.width / 2, 330, 17, 'rgba(255,255,255,0.9)', 'center', 500);

  const hasSave = meta.hasSave;
  const w = 560;
  const h = hasSave ? 300 : 262;
  const x = (VIEW.width - w) / 2;
  const y = 380;
  panel(ctx, rr, x, y, w, h, 20);
  const startY = y + 52;
  ctx.fillStyle = '#ff6b4a';
  rr(ctx, x + 40, startY - 8, w - 80, 52, 14);
  ctx.fill();
  text(hasSave ? 'Continue — pick up where you left off' : 'Start a new game', VIEW.width / 2, startY + 26, 20, '#ffffff', 'center', 700);
  if (hasSave) {
    text(`Saved cash: $${(meta.saveCash || 0).toLocaleString('en-US')} · Mission ${Math.min((meta.saveMission || 0) + 1, missionCount())} of ${missionCount()}`, VIEW.width / 2, startY + 84, 15, PALETTE.hudMuted, 'center', 500);
    text('Press C for a fresh start', VIEW.width / 2, startY + 112, 15, PALETTE.hudMuted, 'center', 500);
  }
  text('WASD move · E car · Mouse aim, click shoot · F punch · R reload · P pause · M mute', VIEW.width / 2, y + h - 30, 14, PALETTE.hudMuted, 'center', 500);
  if (meta.best > 0) {
    text(`Best cash: $${meta.best.toLocaleString('en-US')}`, VIEW.width / 2, y + h + 34, 15, PALETTE.gold, 'center', 700);
  }
}
