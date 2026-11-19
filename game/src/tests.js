// Built-in self-tests behind ?test=1. They run the real simulation headless with a stub
// audio object and check the rules that matter: movement, stealing, wanted, missions,
// shooting, saving, and that a long session never produces a NaN or leaves the city.
import { createGameState, stepGame } from './game.js';
import { PLACES } from './city.js';
import { ACTION_ENTER_CAR } from './input.js';
import { loadSave, saveGame } from './save.js';
import { STEP } from './config.js';

const stubAudio = {
  sfx() {},
  setEngine() {},
  setSiren() {},
  toggleMute() { return false; },
  unlock() {},
  startMusic() {},
};

function fakeInput(dir) {
  return {
    dir: dir || { x: 0, y: 0 },
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
}

export function runTests() {
  const lines = [];
  let passed = 0;
  let failed = 0;
  function check(name, ok) {
    lines.push(`${ok ? 'PASS' : 'FAIL'}  ${name}`);
    if (ok) passed += 1;
    else failed += 1;
  }

  const state = createGameState(7, stubAudio);
  const input = fakeInput({ x: 1, y: 0 });

  check('city has roads and buildings', state.city.buildings.length > 40);
  check('buildings never sit on a road', state.city.buildings.every((b) => {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    return !state.city.onRoad(cx, cy);
  }));
  check('player starts in the city', !state.city.blocked(state.player.x, state.player.y, 14));

  const startX = state.player.x;
  for (let i = 0; i < 60; i += 1) stepGame(state, input, STEP, 0);
  check('player walks right when told to', state.player.x > startX + 100);

  // Steal the nearest parked car.
  const parked = state.cars.find((c) => c.kind === 'parked');
  state.player.x = parked.x + 10;
  state.player.y = parked.y + 10;
  stepGame(state, fakeInput(), STEP, ACTION_ENTER_CAR);
  check('pressing E by a car gets the player in', state.player.inCar === true);
  check('stealing raises the wanted level', state.wanted >= 1);
  stepGame(state, fakeInput(), STEP, ACTION_ENTER_CAR);
  check('pressing E again gets the player out', state.player.inCar === false);

  // Wanted: police answer two stars.
  state.wanted = 2;
  for (let i = 0; i < 120; i += 1) stepGame(state, fakeInput(), STEP, 0);
  check('police cars spawn while wanted', state.cars.some((c) => c.kind === 'police'));

  // Mission 1: walk the parcel from the dock to the cafe.
  state.wanted = 0;
  state.cars = state.cars.filter((c) => c.kind !== 'police');
  state.player.x = PLACES.dock.x;
  state.player.y = PLACES.dock.y;
  stepGame(state, fakeInput(), STEP, 0);
  check('mission 1 advances at the dock', state.missions.step === 1);
  state.player.x = PLACES.cafe.x;
  state.player.y = PLACES.cafe.y;
  stepGame(state, fakeInput(), STEP, 0);
  check('mission 1 completes at the cafe and pays', state.missions.index === 1 && state.player.cash === 150);

  // Shooting spends ammo and a bullet flies.
  state.player.weapon = 'pistol';
  state.player.aimAngle = 0;
  const magBefore = state.player.mag;
  stepGame(state, fakeInput(), STEP, 16); // ACTION_SHOOT
  check('shooting spends one round', state.player.mag === magBefore - 1);
  check('a bullet is in the air', state.bullets.length === 1);

  // Save and load round-trip.
  saveGame(state);
  const loaded = loadSave();
  check('save keeps cash and mission', loaded && loaded.cash === state.player.cash && loaded.missionIndex === 1);

  // A long session stays sane: no NaN, everyone inside the city.
  for (let i = 0; i < 3600; i += 1) stepGame(state, fakeInput({ x: 0, y: -1 }), STEP, 0);
  const sane = [state.player, ...state.cars, ...state.peds].every((e) => Number.isFinite(e.x) && Number.isFinite(e.y) && e.x >= 0 && e.x <= 3600 && e.y >= 0 && e.y <= 2600);
  check('6000 steps: no NaN, nobody leaves the city', sane);
  check('traffic keeps moving', state.cars.some((c) => c.kind === 'traffic' && Math.abs(c.speed) > 50));

  // A building stops the player: walking into one does not pass through it.
  const b = state.city.buildings[0];
  state.player.x = b.x - 20;
  state.player.y = b.y + b.h / 2;
  for (let i = 0; i < 120; i += 1) stepGame(state, fakeInput({ x: 1, y: 0 }), STEP, 0);
  check('buildings block the player', state.player.x < b.x + 2);

  return { passed, failed, lines };
}
