// The wanted system: crimes raise stars, police cars answer them, and the heat only cools
// off once no officer can see the player. Caught on foot, the player is busted.
import { WANTED, CAR } from './config.js';
import { createCar } from './vehicles.js';

export function addWanted(state, amount, reason) {
  if (state.wanted >= 5) return;
  state.wanted = Math.min(5, state.wanted + amount);
  state.wantedTimer = 0;
  if (state.wanted === 1 && amount > 0) {
    state.messages.push({ text: `Wanted: ${reason} — the police are coming`, t: 2.5 });
  }
}

function policeCount(state) {
  return state.cars.filter((c) => c.kind === 'police').length;
}

function spawnPolice(state) {
  const player = state.player;
  // Appear on a road a little way off, never on top of the player.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const point = state.city.randomRoadPoint();
    const x = point.axis === 'v' ? point.x : point.x;
    const y = point.axis === 'v' ? point.y : point.y;
    if (Math.hypot(x - player.x, y - player.y) > 500) {
      const car = createCar(x, y, 0, '#2b3a55', 'police');
      car.police = true;
      car.speed = CAR.policeSpeed;
      car.health = 100;
      state.cars.push(car);
      return;
    }
  }
}

export function updatePolice(state, dt) {
  const desired = WANTED.policeByStars[state.wanted] || 0;
  const current = policeCount(state);
  if (current < desired) spawnPolice(state);
  if (state.wanted === 0) {
    // No heat, no patrol: stray cruisers drive off.
    state.cars = state.cars.filter((c) => !(c.kind === 'police' && Math.hypot(c.x - state.player.x, c.y - state.player.y) > 900));
  }

  const player = state.player;
  for (const car of state.cars) {
    if (car.kind !== 'police') continue;
    const dx = player.x - car.x;
    const dy = player.y - car.y;
    const dist = Math.hypot(dx, dy) || 1;
    const wantAngle = Math.atan2(dy, dx);
    let diff = wantAngle - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-2.8 * dt, Math.min(2.8 * dt, diff));
    car.speed = CAR.policeSpeed * (dist > 500 ? 1 : 0.85);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    car.blink += dt;
    state.city.resolveCircle(car, 20);

    // Ram the player's car; corner the player on foot.
    if (player.inCar && player.car && dist < 48) {
      player.car.speed *= 0.995;
      player.car.x += (dx / dist) * 30 * dt;
      player.car.y += (dy / dist) * 30 * dt;
      if (state.rng.chance(dt * 2)) state.audio.sfx('crash');
    }
    if (!player.inCar && dist < 30) {
      state.arrestTimer += dt;
      if (state.arrestTimer > WANTED.arrestSeconds) {
        state.busted = true;
      }
    }
  }
  if (!state.cars.some((c) => c.kind === 'police' && Math.hypot(c.x - player.x, c.y - player.y) < 34)) {
    state.arrestTimer = Math.max(0, state.arrestTimer - dt * 2);
  }

  // The heat cools off only while no officer is close.
  if (state.wanted > 0) {
    const near = state.cars.some((c) => c.kind === 'police' && Math.hypot(c.x - player.x, c.y - player.y) < 600);
    if (!near) {
      state.wantedTimer += dt;
      if (state.wantedTimer > WANTED.decaySeconds) {
        state.wanted -= 1;
        state.wantedTimer = 0;
        state.messages.push({ text: state.wanted === 0 ? 'You lost the cops.' : 'The heat is dying down.', t: 2 });
      }
    } else {
      state.wantedTimer = 0;
    }
  }
}
