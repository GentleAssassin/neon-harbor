// The story of Neon Harbor: five chained missions for Kai, a courier who owes the Harbor
// Rats money and climbs out one job at a time. Each mission is steps; a step is a kind
// (go somewhere, steal a car, defeat the thugs, beat the clock, escape) with a target.
import { PLACES } from './city.js';
import { saveGame } from './save.js';
import { spawnThugs } from './combat.js';

const MISSIONS = [
  {
    title: 'Sunrise Courier',
    intro: 'Rosa: "Kai, one parcel, Harbor Dock to Coral Cafe. Easy money — do not open it."',
    reward: 150,
    steps: [
      { kind: 'goto', target: PLACES.dock, objective: 'Pick up the parcel at Harbor Dock' },
      { kind: 'goto', target: PLACES.cafe, objective: 'Deliver the parcel to Coral Cafe' },
    ],
  },
  {
    title: 'Borrowed Wheels',
    intro: 'Rosa: "The client wants a car, no questions. Borrow one — the garage is waiting."',
    reward: 200,
    wantedOnStart: 2,
    steps: [
      { kind: 'steal', objective: 'Steal a car — any car will do (press E)' },
      { kind: 'goto', target: PLACES.garage, objective: 'Drive the car to Neon Garage' },
    ],
  },
  {
    title: 'Pier Rescue',
    intro: 'Mara: "Kai, the Harbor Rats cornered me at Sunset Pier. Bring help — bring yourself."',
    reward: 300,
    steps: [
      { kind: 'goto', target: PLACES.pierEnd, objective: 'Reach Mara at Sunset Pier' },
      { kind: 'defeat', objective: 'Deal with the Harbor Rats' },
      { kind: 'goto', target: PLACES.pierEnd, objective: 'Talk to Mara' },
    ],
  },
  {
    title: 'Hot Delivery',
    intro: 'Rosa: "Bank package, airfield, ninety seconds. The cops already know. Go!"',
    reward: 400,
    wantedOnStart: 3,
    steps: [
      { kind: 'goto', target: PLACES.bank, objective: 'Pick up the package at Harbor Bank' },
      { kind: 'timed', target: PLACES.airfield, time: 90, objective: 'Deliver to Sunset Airfield — beat the clock!' },
    ],
  },
  {
    title: 'The Harbor Heist',
    intro: 'Mara: "One last job. Harbor Bank, the vault, then vanish. This clears everything."',
    reward: 1000,
    wantedOnStart: 4,
    steps: [
      { kind: 'goto', target: PLACES.bank, objective: 'Get inside Harbor Bank' },
      { kind: 'escape', target: PLACES.garage, time: 60, objective: 'Escape to Neon Garage — lose the heat!' },
    ],
  },
];

export function createMissions() {
  return { index: 0, step: 0, timer: 0, done: 0, storyComplete: false, thugsSpawned: false, target: null };
}

function startMission(state) {
  const def = MISSIONS[state.missions.index];
  if (!def) return;
  state.missions.step = 0;
  state.missions.timer = 0;
  state.missions.thugsSpawned = false;
  state.dialogue = { name: def.title, text: def.intro, t: 6 };
  if (def.wantedOnStart) {
    state.wanted = Math.max(state.wanted, def.wantedOnStart);
    state.wantedTimer = 0;
  }
  state.messages.push({ text: `New mission: ${def.title}`, t: 3 });
  state.audio.sfx('mission');
}

export function currentObjective(state) {
  const def = MISSIONS[state.missions.index];
  if (!def || state.missions.storyComplete) return state.missions.storyComplete ? 'Story complete — Neon Harbor is yours!' : '';
  return def.steps[state.missions.step].objective;
}

export function currentMissionTitle(state) {
  const def = MISSIONS[state.missions.index];
  return def ? def.title : '';
}

function advanceStep(state) {
  const missions = state.missions;
  const def = MISSIONS[missions.index];
  missions.step += 1;
  missions.timer = 0;
  missions.thugsSpawned = false;
  if (missions.step < def.steps.length) {
    const step = def.steps[missions.step];
    if (step.kind === 'defeat') {
      spawnThugs(state, PLACES.pierEnd.x - 80, PLACES.pierEnd.y, 2);
      missions.thugsSpawned = true;
    }
    if (step.kind === 'timed' || step.kind === 'escape') missions.timer = step.time;
    return;
  }
  // Mission complete.
  state.player.cash += def.reward;
  missions.done += 1;
  state.floating.push({ x: state.player.x, y: state.player.y - 30, text: `+$${def.reward}`, t: 1.6, color: '#2ec4b6' });
  state.audio.sfx('cash');
  state.dialogue = { name: def.title, text: `Done. $${def.reward} earned — nice work, Kai.`, t: 4 };
  saveGame(state);
  missions.index += 1;
  if (missions.index >= MISSIONS.length) {
    missions.storyComplete = true;
    state.dialogue = { name: 'Neon Harbor', text: 'The debt is paid. The city is yours, Kai.', t: 6 };
    return;
  }
  startMission(state);
}

export function updateMissions(state, dt) {
  const missions = state.missions;
  if (missions.storyComplete) {
    missions.target = null;
    return;
  }
  const def = MISSIONS[missions.index];
  if (!def) return;
  const step = def.steps[missions.step];
  if (!step) return;
  missions.target = step.target || null;
  const player = state.player;
  const distTo = step.target ? Math.hypot(player.x - step.target.x, player.y - step.target.y) : Infinity;

  switch (step.kind) {
    case 'goto':
      if (distTo < 70) {
        state.audio.sfx('pickup');
        advanceStep(state);
      }
      break;
    case 'steal':
      if (player.inCar) advanceStep(state);
      break;
    case 'defeat':
      if (!missions.thugsSpawned) {
        spawnThugs(state, PLACES.pierEnd.x - 80, PLACES.pierEnd.y, 2);
        missions.thugsSpawned = true;
      } else if (state.thugs.length === 0) {
        advanceStep(state);
      }
      break;
    case 'timed':
      if (missions.timer <= 0) missions.timer = step.time;
      missions.timer -= dt;
      if (distTo < 70) {
        advanceStep(state);
      } else if (missions.timer <= 0) {
        missions.timer = step.time;
        state.messages.push({ text: 'Too slow — the client is waiting. Try again!', t: 2.5 });
      }
      break;
    case 'escape':
      if (missions.timer <= 0) missions.timer = step.time;
      missions.timer -= dt;
      if (distTo < 80) {
        state.wanted = 0;
        advanceStep(state);
      } else if (missions.timer <= 0) {
        missions.timer = step.time;
        state.messages.push({ text: 'The heat caught up — slip away and try again!', t: 2.5 });
      }
      break;
    default:
      break;
  }
}

export function missionCount() {
  return MISSIONS.length;
}
