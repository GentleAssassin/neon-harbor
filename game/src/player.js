// The player on foot and in a car: movement, getting in and out, stealing, and health.
// Combat input (punch, shoot, reload) lives here too, but the bullets live in combat.js.
import { PLAYER } from './config.js';
import { driveCar, nearestCar } from './vehicles.js';
import { ACTION_ENTER_CAR } from './input.js';

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, health: PLAYER.health, cash: 0,
    inCar: false, car: null, weapon: 'pistol', mag: 12, reserve: 48,
    punchCd: 0, shootCd: 0, invuln: 0, aimAngle: 0, ownedCar: false,
  };
}

export function updatePlayer(state, input, dt, actions) {
  const player = state.player;
  const city = state.city;
  if (player.punchCd > 0) player.punchCd -= dt;
  if (player.shootCd > 0) player.shootCd -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  if (player.inCar && player.car) {
    const car = player.car;
    driveCar(state, car, input, dt);
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    if (actions & ACTION_ENTER_CAR) {
      // Step out beside the car.
      player.inCar = false;
      player.car = null;
      car.kind = 'parked';
      car.speed = 0;
      player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
      player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      city.resolveCircle(player, PLAYER.radius);
      state.audio.setEngine(0);
    }
    return;
  }

  const dir = input.direction();
  const len = Math.hypot(dir.x, dir.y);
  const running = input.isDown('Shift');
  const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (len > 0) {
    player.x += (dir.x / len) * speed * dt;
    player.y += (dir.y / len) * speed * dt;
    player.angle = Math.atan2(dir.y, dir.x);
    city.resolveCircle(player, PLAYER.radius);
  }

  if (actions & ACTION_ENTER_CAR) {
    const car = nearestCar(state, player.x, player.y, 56);
    if (car) {
      player.inCar = true;
      player.car = car;
      player.ownedCar = false;
      if (car.kind !== 'player') {
        // Stealing a car is a crime the whole street sees.
        car.kind = 'player';
        if (car.police) {
          player.inCar = false;
          player.car = null;
          state.messages.push({ text: 'That is a police car. Find another ride.', t: 2.5 });
        } else {
          state.audio.sfx('steal');
          state.police.addWanted(state, 1, 'car theft');
          state.stats.stolen += 1;
          state.messages.push({ text: 'Car stolen — the police are on their way!', t: 2.5 });
        }
      }
      if (player.inCar) state.audio.sfx('pickup');
    }
  }

  // Slow health recovery when the heat is off.
  if (state.wanted === 0 && player.health > 0 && player.health < PLAYER.health) {
    player.health = Math.min(PLAYER.health, player.health + 2.5 * dt);
  }
}
