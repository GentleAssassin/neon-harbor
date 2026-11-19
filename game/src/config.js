// Every tuning number and colour for Neon Harbor in one place. The world is a fixed
// 3600 x 2600 coastal city; the renderer shows a 1280 x 720 window of it and scales that
// window to the browser, so no rule below depends on the screen size.
export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3600, height: 2600 };
export const STEP = 1 / 60;

/** Golden-hour palette: warm sand, teal sea, coral accent, quiet dark chrome. */
export const PALETTE = {
  grass: '#7fae62',
  grassDark: '#6f9c55',
  sand: '#e8cf9a',
  sea: '#2e7f9e',
  seaDeep: '#256b87',
  road: '#3d3a44',
  roadEdge: '#2e2b33',
  roadLine: '#e8d44d',
  sidewalk: '#9a938a',
  building: ['#c96f4a', '#d9a05b', '#7a9e7e', '#5b7fa6', '#b0576e', '#8a7fb8', '#a8b05b', '#4a7a6f'],
  roof: '#00000033',
  park: '#5d8f4e',
  palm: '#3f7a3a',
  player: '#ffcf3f',
  playerCar: '#e84c3d',
  traffic: ['#d8d8d8', '#4a90d9', '#e8a33d', '#7fb069', '#c9c9c9', '#8e6cc9'],
  police: '#2b3a55',
  policeLight: ['#ff3b30', '#3b82ff'],
  ped: ['#f2f2f2', '#ff9f43', '#6bcbef', '#f78fb3', '#a3cb38'],
  thug: '#3d2b3d',
  hud: '#14101acc',
  hudText: '#f5efe2',
  hudMuted: '#b8ad9c',
  accent: '#ff6b4a',
  gold: '#ffc93f',
  star: '#ffd94d',
  marker: '#ffd94d',
  health: '#58d68d',
  danger: '#ff4d4d',
  font: 'system-ui, -apple-system, "Segoe UI", sans-serif',
};

export const PLAYER = {
  radius: 14,
  walkSpeed: 250,
  runSpeed: 330,
  health: 100,
  punchDamage: 25,
  punchRange: 34,
  punchCooldown: 0.45,
};

export const CAR = {
  length: 46,
  width: 22,
  maxSpeed: 460,
  policeSpeed: 500,
  accel: 300,
  brake: 520,
  reverseMax: 140,
  steer: 2.6,
  grip: 6.5,
};

export const WANTED = {
  decaySeconds: 14,
  policeByStars: [0, 1, 1, 2, 3, 4],
  arrestSeconds: 1.4,
  bustFine: 100,
};

export const SAVE_KEY = 'neon-harbor.save.v1';
export const BEST_KEY = 'neon-harbor.best.v1';

/** The screens the game moves between. */
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WIN = 'win';
