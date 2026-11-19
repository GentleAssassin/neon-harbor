// Pedestrians: locals strolling the sidewalks who scatter when shots ring out. Getting
// hit by a car or a bullet is a crime — the wanted system hears about it in police.js.
import { ROAD_W } from './city.js';

export function spawnPeds(state, count) {
  for (let i = 0; i < count; i += 1) {
    const point = state.city.randomRoadPoint();
    const side = state.rng.pick([-1, 1]);
    state.peds.push({
      x: point.axis === 'v' ? point.x + side * (ROAD_W / 2 + 12) : point.x,
      y: point.axis === 'v' ? point.y : point.y + side * (ROAD_W / 2 + 12),
      angle: 0,
      speed: state.rng.range(36, 70),
      axis: point.axis,
      dir: state.rng.pick([-1, 1]),
      color: state.rng.pick(['#f2f2f2', '#ff9f43', '#6bcbef', '#f78fb3', '#a3cb38', '#ffd94d']),
      flee: 0,
      fleeX: 0,
      fleeY: 0,
    });
  }
}

export function scarePeds(state, x, y, radius) {
  for (const ped of state.peds) {
    if (Math.hypot(ped.x - x, ped.y - y) < radius) {
      ped.flee = 2;
      ped.fleeX = x;
      ped.fleeY = y;
    }
  }
}

export function updatePeds(state, dt) {
  const keep = [];
  for (const ped of state.peds) {
    // A fast car bearing down scatters the pedestrians before it arrives.
    if (ped.flee <= 0) {
      for (const car of state.cars) {
        if (Math.abs(car.speed) > 150 && Math.hypot(car.x - ped.x, car.y - ped.y) < 90) {
          ped.flee = 1.4;
          ped.fleeX = car.x;
          ped.fleeY = car.y;
          break;
        }
      }
    }
    if (ped.flee > 0) {
      ped.flee -= dt;
      const dx = ped.x - ped.fleeX;
      const dy = ped.y - ped.fleeY;
      const d = Math.hypot(dx, dy) || 1;
      ped.x += (dx / d) * 150 * dt;
      ped.y += (dy / d) * 150 * dt;
      ped.angle = Math.atan2(dy, dx);
      state.city.resolveCircle(ped, 10);
      keep.push(ped);
      continue;
    }
    const step = ped.speed * ped.dir * dt;
    if (ped.axis === 'v') ped.y += step;
    else ped.x += step;
    ped.angle = ped.axis === 'v' ? (ped.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (ped.dir > 0 ? 0 : Math.PI);
    if (ped.axis === 'v' && (ped.y < 80 || ped.y > 2240)) ped.dir *= -1;
    if (ped.axis === 'h' && (ped.x < 80 || ped.x > 3300)) ped.dir *= -1;
    if (state.rng.chance(dt * 0.08)) ped.dir *= -1;

    // Hit by a moving car.
    let down = false;
    for (const car of state.cars) {
      if (Math.abs(car.speed) > 60 && Math.hypot(car.x - ped.x, car.y - ped.y) < 26) {
        down = true;
        break;
      }
    }
    if (down) {
      state.particles.push({ x: ped.x, y: ped.y, vx: 0, vy: 0, life: 0.5, maxLife: 0.5, color: '#ff4d4d', size: 6 });
      if (state.player.car) {
        state.police.addWanted(state, 1, 'hit pedestrian');
        state.messages.push({ text: 'You hit a pedestrian!', t: 2 });
      }
      continue; // the ped is gone; a fresh one strolls in later
    }
    keep.push(ped);
  }
  state.peds = keep;
  // The streets refill slowly so the city never empties.
  if (state.peds.length < 14 && state.rng.chance(dt * 0.5)) spawnPeds(state, 1);
}
