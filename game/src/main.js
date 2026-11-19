// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps, and the renderer paints what is there. The game moves between title, play,
// paused, busted, game over and win. ?seed=N fixes the city. ?shot=start|drive|chase|
// mission stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot. ?test=1 runs the built-in self-tests.
import { STEP, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_BUSTED, SCREEN_WIN } from './config.js';
import { PLACES } from './city.js';
import { createGameState, stepGame } from './game.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { loadSave, saveGame, clearSave, readBestCash, saveBestCash } from './save.js';
import { stageShot } from './shots.js';
import { runTests } from './tests.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const save = loadSave();
let best = readBestCash();

let state = createGameState(seed, audio);

const meta = {
  best,
  hasSave: !!save,
  saveCash: save ? save.cash : 0,
  saveMission: save ? save.missionIndex : 0,
  mouse: input.mouse,
};

function announce(message) {
  status.textContent = message;
}

function newGame(fresh) {
  if (fresh) clearSave();
  state = createGameState(Math.floor(Math.random() * 4294967296), audio);
  meta.hasSave = !!loadSave();
  meta.saveCash = state.player.cash;
  meta.saveMission = state.missions.index;
}

function applyBusted() {
  state.player.cash = Math.max(0, state.player.cash - 100);
  state.stats.busted += 1;
  state.player.inCar = false;
  state.player.car = null;
  state.player.x = PLACES.hospital.x;
  state.player.y = PLACES.hospital.y;
  state.player.health = 100;
  state.wanted = 0;
  state.arrestTimer = 0;
  state.busted = false;
  state.cars = state.cars.filter((c) => c.kind !== 'police');
  audio.sfx('busted');
  saveGame(state);
  announce('Busted. The police took $100 and let you go.');
}

function applyWasted() {
  state.stats.wasted += 1;
  if (state.player.cash > best) {
    best = state.player.cash;
    saveBestCash(best);
    meta.best = best;
  }
  announce(`Kai is down. Cash kept $${state.player.cash}.`);
}

function applyWin() {
  if (state.player.cash > best) {
    best = state.player.cash;
    saveBestCash(best);
    meta.best = best;
  }
  saveGame(state);
  announce('Neon Harbor is yours. All five missions complete.');
}

function runShot(name) {
  const shotState = createGameState(seed, audio, true);
  // Screenshots are deterministic: no save, no best cash, just the scene itself.
  const shotMeta = { best: 0, hasSave: false, saveCash: 0, saveMission: 0, mouse: input.mouse };
  const scene = stageShot(name, shotState);
  let painted = 0;
  function paint() {
    renderer.draw(shotState, scene.screen, shotMeta);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runTestMode() {
  const result = runTests();
  window.__testResult = result;
  for (const line of result.lines) console.log(line);
  console.log(`tests: ${result.passed} passed, ${result.failed} failed`);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#1a1b41';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#f5efe2';
  ctx.font = '20px system-ui, sans-serif';
  result.lines.forEach((line, i) => ctx.fillText(line, 40, 60 + i * 30));
  ctx.fillText(`tests: ${result.passed} passed, ${result.failed} failed`, 40, 60 + result.lines.length * 30);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  const idleInput = {
    mouse: input.mouse,
    direction() {
      return { x: 0, y: 0 };
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

  function startGame() {
    audio.unlock();
    audio.startMusic();
    screen = SCREEN_PLAY;
    announce('Playing. Follow the mission card at the top.');
  }

  function handleActions(actions, freshStart) {
    if (screen === SCREEN_TITLE) {
      if (freshStart) {
        newGame(true);
        meta.hasSave = false;
        announce('Fresh start. The old save is gone.');
        return;
      }
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        saveGame(state);
        announce('Paused.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_WIN) {
        newGame(true);
        screen = SCREEN_TITLE;
        announce('Neon Harbor. Press Enter or click to start.');
      } else {
        newGame(false);
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function step(actions) {
    if (screen === SCREEN_TITLE) {
      stepGame(state, idleInput, STEP, 0);
      return;
    }
    // Aim from the mouse: view space to world space through the camera.
    const wx = state.camera.x - 640 + input.mouse.x;
    const wy = state.camera.y - 360 + input.mouse.y;
    state.player.aimAngle = Math.atan2(wy - state.player.y, wx - state.player.x);
    stepGame(state, input, STEP, actions);
    if (state.busted) {
      applyBusted();
      screen = SCREEN_BUSTED;
    } else if (state.wasted) {
      applyWasted();
      screen = SCREEN_OVER;
    } else if (state.missions.storyComplete && screen === SCREEN_PLAY) {
      applyWin();
      screen = SCREEN_WIN;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Actions are taken once per frame: the screen handler gets them, and the first
    // simulation step of the frame gets them too; later steps get none, so a press
    // is never lost and never counted twice. wasPressed is read before takeActions
    // clears it.
    const freshStart = input.wasPressed('c') || input.wasPressed('C');
    const actions = input.takeActions();
    handleActions(actions, freshStart);
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, meta);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveGame(state);
      announce('Paused.');
    }
  });

  announce('Neon Harbor. Press Enter or click to start.');
  // A read-only hook for live play-testing from the browser console.
  Object.defineProperty(window, '__game', { get: () => state });
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else if (params.get('test') === '1') runTestMode();
else runGame();
