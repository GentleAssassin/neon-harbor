// The simulation core: one state object, one fixed step. main.js runs it live, shots.js
// runs it scripted for screenshots, tests.js runs it headless — the same rules everywhere.
import { createRandom } from './random.js';
import { createCity, PLACES } from './city.js';
import { WORLD } from './config.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnTraffic, spawnParked, updateCars } from './vehicles.js';
import { spawnPeds, updatePeds, scarePeds } from './pedestrians.js';
import { addWanted, updatePolice } from './police.js';
import { updateThugs, updateBullets, updatePickups, tryShoot, tryPunch } from './combat.js';
import { createMissions, updateMissions } from './missions.js';
import { loadSave } from './save.js';
import { ACTION_ENTER_CAR, ACTION_MUTE, ACTION_PUNCH, ACTION_RELOAD, ACTION_SHOOT, ACTION_WEAPON } from './input.js';

export function createGameState(seed, audio, fresh) {
  const rng = createRandom(seed);
  const city = createCity(rng);
  const state = {
    seed, rng, city, audio,
    time: 0,
    player: createPlayer(PLACES.plaza.x, PLACES.plaza.y + 60),
    cars: [], peds: [], thugs: [], bullets: [], particles: [], pickups: [], floating: [],
    wanted: 0, wantedTimer: 0, arrestTimer: 0,
    missions: createMissions(),
    messages: [], dialogue: null,
    camera: { x: PLACES.plaza.x, y: PLACES.plaza.y },
    busted: false, wasted: false,
    stats: { stolen: 0, busted: 0, wasted: 0 },
    police: { addWanted },
    pedestrians: { scarePeds },
  };
  spawnTraffic(state, 14);
  spawnParked(state, 10);
  spawnPeds(state, 18);
  const save = fresh ? null : loadSave();
  if (save) {
    state.player.cash = save.cash;
    state.missions.index = Math.min(save.missionIndex, 4);
    state.missions.done = save.missionsDone || 0;
    state.missions.storyComplete = !!save.storyComplete;
  }
  return state;
}

/** One fixed step of the whole game. `actions` is the bitmask from input.takeActions(). */
export function stepGame(state, input, dt, actions) {
  state.time += dt;
  const player = state.player;

  if (actions & ACTION_MUTE) state.audio.toggleMute();
  if (actions & ACTION_WEAPON) player.weapon = player.weapon === 'pistol' ? 'fists' : 'pistol';
  if (actions & ACTION_RELOAD) {
    const need = 12 - player.mag;
    const take = Math.min(need, player.reserve);
    if (take > 0) {
      player.mag += take;
      player.reserve -= take;
      state.audio.sfx('pickup');
    }
  }
  if ((actions & ACTION_PUNCH) && !player.inCar) tryPunch(state);
  if (((actions & ACTION_SHOOT) || (input.mouse.down && !player.inCar)) && !player.inCar) {
    tryShoot(state);
  }

  updatePlayer(state, input, dt, actions);
  updateCars(state, dt);
  updatePeds(state, dt);
  updatePolice(state, dt);
  updateThugs(state, dt);
  updateBullets(state, dt);
  updatePickups(state, dt);
  updateMissions(state, dt);

  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floating) {
    f.t -= dt;
    f.y -= 24 * dt;
  }
  state.floating = state.floating.filter((f) => f.t > 0);
  for (const m of state.messages) m.t -= dt;
  state.messages = state.messages.filter((m) => m.t > 0);
  if (state.dialogue) {
    state.dialogue.t -= dt;
    if (state.dialogue.t <= 0) state.dialogue = null;
  }

  // Smooth camera follow, clamped so the view never leaves the city.
  const cam = state.camera;
  cam.x += (player.x - cam.x) * Math.min(1, dt * 5);
  cam.y += (player.y - cam.y) * Math.min(1, dt * 5);
  cam.x = Math.max(640, Math.min(WORLD.width - 640, cam.x));
  cam.y = Math.max(360, Math.min(WORLD.height - 360, cam.y));

  state.audio.setSiren(state.wanted > 0);
  if (!player.inCar) state.audio.setEngine(0);
  if (player.health <= 0 && !state.wasted) state.wasted = true;
}
