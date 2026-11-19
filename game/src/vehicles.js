// Cars: traffic that drives the road grid, parked cars to steal, and the arcade driving
// physics for the car the player is in. A car is a circle of radius 20 for collisions, no
// matter how the renderer draws it.
import { CAR } from './config.js';
import { BEACH_Y, ROAD_W, V_ROADS, H_ROADS, WATER_X } from './city.js';

export function createCar(x, y, angle, color, kind) {
  return {
    x, y, angle, speed: 0, color, kind,
    axis: 'v', line: x, dir: 1, lane: 20,
    cruise: 150, health: 100, police: false, blink: 0,
  };
}

export function spawnTraffic(state, count) {
  for (let i = 0; i < count; i += 1) {
    const point = state.city.randomRoadPoint();
    const car = createCar(point.x, point.y, 0, state.rng.pick(['#d8d8d8', '#4a90d9', '#e8a33d', '#7fb069', '#c9c9c9', '#8e6cc9', '#e07a5f']), 'traffic');
    car.axis = point.axis;
    car.line = point.axis === 'v' ? point.x : point.y;
    car.dir = state.rng.pick([-1, 1]);
    car.lane = state.rng.pick([-1, 1]) * 20;
    car.cruise = state.rng.range(120, 210);
    car.speed = car.cruise;
    car.angle = point.axis === 'v' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
    state.cars.push(car);
  }
}

export function spawnParked(state, count) {
  for (let i = 0; i < count; i += 1) {
    const point = state.city.randomRoadPoint();
    const car = createCar(point.x, point.y, 0, state.rng.pick(['#e84c3d', '#ffd94d', '#2ec4b6', '#ff6b9d', '#f5f0e6', '#3d5a80']), 'parked');
    car.axis = point.axis;
    car.angle = point.axis === 'v' ? (state.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (state.rng.chance(0.5) ? 0 : Math.PI);
    state.cars.push(car);
  }
}

/** The nearest car the player could get into, or null. */
export function nearestCar(state, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.kind === 'player') continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function turnAtIntersection(state, car, dt) {
  const roads = car.axis === 'v' ? H_ROADS : V_ROADS;
  const along = car.axis === 'v' ? car.y : car.x;
  for (const line of roads) {
    const near = car.axis === 'v' ? Math.abs(along - line) < 8 : Math.abs(along - line) < 8;
    if (near && state.rng.chance(dt * 0.35)) {
      car.axis = car.axis === 'v' ? 'h' : 'v';
      car.line = line;
      car.dir = state.rng.pick([-1, 1]);
      car.lane = state.rng.pick([-1, 1]) * 20;
      return;
    }
  }
}

function updateTrafficCar(state, car, dt) {
  // Slow down for the car ahead on the same road and lane.
  let target = car.cruise;
  for (const other of state.cars) {
    if (other === car || other.axis !== car.axis || other.line !== car.line || other.dir !== car.dir) continue;
    const ahead = car.axis === 'v' ? (other.y - car.y) * car.dir : (other.x - car.x) * car.dir;
    if (ahead > 0 && ahead < 90) {
      target = 0;
      break;
    }
  }
  car.speed += (target - car.speed) * Math.min(1, dt * 2);
  turnAtIntersection(state, car, dt);
  if (car.axis === 'v') {
    car.y += car.dir * car.speed * dt;
    car.x = car.line + car.lane;
    car.angle = car.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    if (car.y < 100) car.dir = 1;
    if (car.y > BEACH_Y - 100) car.dir = -1;
  } else {
    car.x += car.dir * car.speed * dt;
    car.y = car.line + car.lane;
    car.angle = car.dir > 0 ? 0 : Math.PI;
    if (car.x < 100) car.dir = 1;
    if (car.x > WATER_X - 100) car.dir = -1;
  }
}

/** Arcade driving for the player's car: accelerate, brake, steer with speed, gentle drift. */
export function driveCar(state, car, input, dt) {
  const dir = input.direction();
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };
  if (dir.y < 0) car.speed += CAR.accel * dt;
  else if (dir.y > 0) car.speed -= CAR.brake * dt;
  else car.speed -= car.speed * 0.6 * dt;
  if (input.isDown(' ')) car.speed -= car.speed * 2.2 * dt;
  car.speed = Math.max(-CAR.reverseMax, Math.min(CAR.maxSpeed, car.speed));
  const steerAmount = dir.x * CAR.steer * (car.speed / CAR.maxSpeed) * dt * (car.speed < 0 ? -1 : 1);
  car.angle += steerAmount;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  void forward;
  const hitWall = state.city.resolveCircle(car, 20);
  if (hitWall && Math.abs(car.speed) > 120) {
    state.audio.sfx('crash');
    state.particles.push({ x: car.x, y: car.y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, color: '#ffd94d', size: 5 });
    car.speed *= 0.4;
  }
  state.audio.setEngine(Math.abs(car.speed) / CAR.maxSpeed);
}

export function updateCars(state, dt) {
  for (const car of state.cars) {
    if (car.kind === 'traffic') updateTrafficCar(state, car, dt);
    if (car.kind === 'police') continue; // police.js steers those
  }
  // Car-to-car bumps: push apart and trade a little speed.
  for (let i = 0; i < state.cars.length; i += 1) {
    for (let j = i + 1; j < state.cars.length; j += 1) {
      const a = state.cars[i];
      const b = state.cars[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      if (d > 0.01 && d < 40) {
        const push = (40 - d) / 2;
        const nx = dx / d;
        const ny = dy / d;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
        if (Math.abs(a.speed) + Math.abs(b.speed) > 200) {
          state.particles.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: 0, vy: 0, life: 0.3, maxLife: 0.3, color: '#ffd94d', size: 4 });
        }
      }
    }
  }
}
