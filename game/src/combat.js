// Combat: the pistol and the punch, bullets, the Harbor Rats who shoot back, and the
// pickups they drop. A bullet is a point with a velocity; the city stops it, everything
// else in its way takes the hit.
import { PLAYER } from './config.js';

export function tryShoot(state) {
  const player = state.player;
  if (player.weapon !== 'pistol' || player.shootCd > 0) return;
  if (player.mag <= 0) {
    state.messages.push({ text: 'Out of ammo — press R to reload', t: 1.5 });
    player.shootCd = 0.3;
    return;
  }
  player.mag -= 1;
  player.shootCd = 0.22;
  const x = player.x + Math.cos(player.aimAngle) * 20;
  const y = player.y + Math.sin(player.aimAngle) * 20;
  state.bullets.push({ x, y, vx: Math.cos(player.aimAngle) * 780, vy: Math.sin(player.aimAngle) * 780, from: 'player', life: 1.1 });
  state.particles.push({ x, y, vx: 0, vy: 0, life: 0.08, maxLife: 0.08, color: '#ffe66d', size: 8 });
  state.audio.sfx('shoot');
  state.police.addWanted(state, 0, ''); // firing is only a crime when it lands; see updateBullets
  state.pedestrians.scarePeds(state, player.x, player.y, 320);
}

export function tryPunch(state) {
  const player = state.player;
  if (player.punchCd > 0) return;
  player.punchCd = PLAYER.punchCooldown;
  state.audio.sfx('punch');
  const px = player.x + Math.cos(player.aimAngle) * PLAYER.punchRange;
  const py = player.y + Math.sin(player.aimAngle) * PLAYER.punchRange;
  for (const thug of state.thugs) {
    if (Math.hypot(thug.x - px, thug.y - py) < 40) {
      damageThug(state, thug, PLAYER.punchDamage);
      return;
    }
  }
  for (let i = 0; i < state.peds.length; i += 1) {
    const ped = state.peds[i];
    if (Math.hypot(ped.x - px, ped.y - py) < 34) {
      state.peds.splice(i, 1);
      state.police.addWanted(state, 1, 'assault');
      state.messages.push({ text: 'You punched a pedestrian!', t: 2 });
      return;
    }
  }
}

export function spawnThugs(state, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    state.thugs.push({
      x: x + state.rng.range(-60, 60),
      y: y + state.rng.range(-60, 60),
      angle: 0, health: 60, shootCd: state.rng.range(0.5, 1.5), speed: 95,
    });
  }
}

export function damageThug(state, thug, amount) {
  thug.health -= amount;
  state.audio.sfx('hit');
  state.particles.push({ x: thug.x, y: thug.y, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, color: '#ff4d4d', size: 5 });
  if (thug.health <= 0) {
    thug.dead = true;
    spawnPickup(state, thug.x, thug.y, state.rng.chance(0.5) ? 'cash' : 'ammo', state.rng.chance(0.5) ? 40 : 12);
    state.messages.push({ text: 'Thug down', t: 1.2 });
  }
}

export function spawnPickup(state, x, y, kind, amount) {
  state.pickups.push({ x, y, kind, amount, t: 0 });
}

export function updateThugs(state, dt) {
  const player = state.player;
  for (const thug of state.thugs) {
    if (thug.dead) continue;
    const dx = player.x - thug.x;
    const dy = player.y - thug.y;
    const dist = Math.hypot(dx, dy) || 1;
    thug.angle = Math.atan2(dy, dx);
    if (dist < 520) {
      if (dist > 260) {
        thug.x += (dx / dist) * thug.speed * dt;
        thug.y += (dy / dist) * thug.speed * dt;
        state.city.resolveCircle(thug, 12);
      }
      thug.shootCd -= dt;
      if (thug.shootCd <= 0 && dist < 480) {
        thug.shootCd = 1.4;
        const spread = state.rng.range(-0.14, 0.14);
        const a = thug.angle + spread;
        state.bullets.push({ x: thug.x + Math.cos(a) * 18, y: thug.y + Math.sin(a) * 18, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, from: 'thug', life: 1.2 });
        state.audio.sfx('shoot');
      }
    }
  }
  state.thugs = state.thugs.filter((t) => !t.dead);
}

export function updateBullets(state, dt) {
  const player = state.player;
  const keep = [];
  for (const b of state.bullets) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) continue;
    if (state.city.blocked(b.x, b.y, 2)) {
      state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.2, maxLife: 0.2, color: '#ffd94d', size: 3 });
      continue;
    }
    let hit = false;
    if (b.from !== 'player') {
      if (!player.inCar && Math.hypot(b.x - player.x, b.y - player.y) < 14 && player.invuln <= 0) {
        player.health -= 9;
        player.invuln = 0.4;
        state.audio.sfx('hit');
        hit = true;
      }
    } else {
      for (const thug of state.thugs) {
        if (!thug.dead && Math.hypot(b.x - thug.x, b.y - thug.y) < 15) {
          damageThug(state, thug, 34);
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (let i = 0; i < state.peds.length; i += 1) {
          const ped = state.peds[i];
          if (Math.hypot(b.x - ped.x, b.y - ped.y) < 13) {
            state.peds.splice(i, 1);
            state.police.addWanted(state, 1, 'shot a pedestrian');
            hit = true;
            break;
          }
        }
      }
      if (!hit) {
        for (const car of state.cars) {
          if (car.kind === 'police' && Math.hypot(b.x - car.x, b.y - car.y) < 22) {
            car.health -= 34;
            state.particles.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.25, maxLife: 0.25, color: '#ff9f68', size: 4 });
            if (car.health <= 0) {
              car.destroyed = true;
              state.police.addWanted(state, 1, 'destroyed a police car');
              state.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.7, maxLife: 0.7, color: '#ff6b4a', size: 16 });
              state.audio.sfx('crash');
            }
            hit = true;
            break;
          }
        }
      }
      if (hit) state.police.addWanted(state, 0, '');
    }
    if (!hit) keep.push(b);
  }
  state.bullets = keep;
  state.cars = state.cars.filter((c) => !c.destroyed);
}

export function updatePickups(state, dt) {
  const player = state.player;
  const keep = [];
  for (const p of state.pickups) {
    p.t += dt;
    if (Math.hypot(p.x - player.x, p.y - player.y) < 30) {
      if (p.kind === 'cash') {
        player.cash += p.amount;
        state.floating.push({ x: player.x, y: player.y - 20, text: `+$${p.amount}`, t: 1.2, color: '#2ec4b6' });
        state.audio.sfx('cash');
      } else if (p.kind === 'ammo') {
        player.reserve += p.amount;
        state.messages.push({ text: `+${p.amount} ammo`, t: 1.2 });
        state.audio.sfx('pickup');
      } else {
        player.health = Math.min(100, player.health + 30);
        state.messages.push({ text: '+30 health', t: 1.2 });
        state.audio.sfx('pickup');
      }
      continue;
    }
    keep.push(p);
  }
  state.pickups = keep;
}
