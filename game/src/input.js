// Keyboard and mouse state, read fresh every frame. Keys are the game's own names, so the
// rest of the code never spells a key twice. `takeActions` hands out one-shot presses.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_SHOOT = 16;
export const ACTION_RELOAD = 32;
export const ACTION_MUTE = 64;
export const ACTION_WEAPON = 128;

const KEY_ACTIONS = {
  Enter: ACTION_CONFIRM,
  ' ': ACTION_CONFIRM,
  Escape: ACTION_PAUSE,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  e: ACTION_ENTER_CAR,
  E: ACTION_ENTER_CAR,
  f: ACTION_PUNCH,
  F: ACTION_PUNCH,
  r: ACTION_RELOAD,
  R: ACTION_RELOAD,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
  q: ACTION_WEAPON,
  Q: ACTION_WEAPON,
};

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let actions = 0;

  function keyDown(event) {
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) {
      keys.add(event.key);
      pressed.add(event.key);
      const action = KEY_ACTIONS[event.key];
      if (action) actions |= action;
    }
  }
  function keyUp(event) {
    keys.delete(event.key);
  }
  function mouseMove(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 1280;
    mouse.y = ((event.clientY - rect.top) / rect.height) * 720;
  }
  function mouseDown(event) {
    mouseMove(event);
    mouse.down = true;
    mouse.clicked = true;
    actions |= ACTION_SHOOT;
  }
  function mouseUp() {
    mouse.down = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('mousemove', mouseMove);
  canvas.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', mouseUp);
  canvas.addEventListener('click', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    mouse,
    /** -1/0/1 movement on each axis from WASD or the arrow keys. */
    direction() {
      const left = keys.has('a') || keys.has('A') || keys.has('ArrowLeft');
      const right = keys.has('d') || keys.has('D') || keys.has('ArrowRight');
      const up = keys.has('w') || keys.has('W') || keys.has('ArrowUp');
      const down = keys.has('s') || keys.has('S') || keys.has('ArrowDown');
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    isDown(key) {
      return keys.has(key);
    },
    wasPressed(key) {
      return pressed.has(key);
    },
    takeActions() {
      const out = actions;
      actions = 0;
      pressed.clear();
      mouse.clicked = false;
      return out;
    },
  };
}
