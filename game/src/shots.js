// The deterministic screenshot scenes behind ?shot=start|drive|chase|mission. Each one
// plays the real rules forward from a fresh state for a fixed number of steps, steered by
// a simple autopilot, so the frame is what real play looks like and the same seed always
// gives the same frame.
import { STEP, SCREEN_TITLE, SCREEN_PLAY } from './config.js';
import { PLACES } from './city.js';
import { stepGame } from './game.js';
import { nearestCar } from './vehicles.js';

function scriptedInput() {
  const input = {
    dir: { x: 0, y: 0 },
    mouse: { x: 640, y: 360, down: false, clicked: false },
    direction() {
      return this.dir;
    },
    isDown() {
      return false;
    },
    wasPressed() {
      return false;
    },
    takeActions() {
      return 0;
    },
  };
  return input;
}

/** Steer a car toward a point: accelerate and turn toward the target. */
function driveToward(state, input, tx, ty) {
  const player = state.player;
  const want = Math.atan2(ty - player.y, tx - player.x);
  let diff = want - player.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  input.dir = { x: diff > 0.12 ? 1 : diff < -0.12 ? -1 : 0, y: -1 };
}

function putPlayerInCar(state, x, y) {
  const car = nearestCar(state, x, y, 400) || state.cars.find((c) => c.kind === 'parked' || c.kind === 'traffic');
  if (!car) return;
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.inCar = true;
  state.player.car = car;
  car.kind = 'player';
  car.speed = 200;
}

/**
 * Set `state` to the named scene and return the screen to draw over it.
 * Scenes: start (title over the city), drive (a car on the avenue), chase (wanted 3,
 * police on the tail), mission (a timed delivery with the objective on the HUD).
 */
export function stageShot(name, state) {
  const input = scriptedInput();
  if (name === 'drive') {
    putPlayerInCar(state, PLACES.plaza.x, PLACES.plaza.y);
    for (let i = 0; i < 6 / STEP; i += 1) {
      driveToward(state, input, 1120, 320);
      stepGame(state, input, STEP, 0);
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    putPlayerInCar(state, PLACES.plaza.x, PLACES.plaza.y);
    state.wanted = 3;
    state.wantedTimer = 0;
    for (let i = 0; i < 9 / STEP; i += 1) {
      driveToward(state, input, 1520, 320);
      stepGame(state, input, STEP, 0);
    }
    state.dialogue = { name: 'Rosa', text: 'The cops are on you — do not stop, Kai!', t: 6 };
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    state.missions.index = 3;
    state.missions.step = 1;
    state.missions.timer = 82;
    state.missions.target = PLACES.airfield;
    state.wanted = 3;
    state.wantedTimer = 0;
    state.dialogue = { name: 'Rosa', text: 'Bank package, airfield, ninety seconds. Go!', t: 6 };
    putPlayerInCar(state, PLACES.bank.x, PLACES.bank.y);
    for (let i = 0; i < 3.5 / STEP; i += 1) {
      driveToward(state, input, PLACES.airfield.x, PLACES.airfield.y);
      stepGame(state, input, STEP, 0);
    }
    state.missions.timer = 82;
    return { screen: SCREEN_PLAY };
  }
  // Start: the city alive behind the title, camera over Sunset Plaza.
  for (let i = 0; i < 5 / STEP; i += 1) stepGame(state, input, STEP, 0);
  state.camera.x = PLACES.plaza.x;
  state.camera.y = PLACES.plaza.y;
  return { screen: SCREEN_TITLE };
}
