const keys = new Map();
let mouseDX = 0;
let mouseDY = 0;
let locked = false;

export function initInput() {
  document.addEventListener('keydown', (e) => {
    keys.set(e.code, true);
  });

  document.addEventListener('keyup', (e) => {
    keys.set(e.code, false);
  });

  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    mouseDX += e.movementX;
    mouseDY += e.movementY;
  });

  document.addEventListener('click', () => {
    if (!locked) {
      document.body.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === document.body;
    const prompt = document.getElementById('prompt');
    if (prompt) prompt.style.display = locked ? 'none' : 'block';
  });
}

export function updateInput() {
  // Mouse delta is consumed each frame
}

export function consumeMouseDelta() {
  const dx = mouseDX;
  const dy = mouseDY;
  mouseDX = 0;
  mouseDY = 0;
  return { dx, dy };
}

export function isKeyDown(code) {
  return keys.get(code) === true;
}

export function isLocked() {
  return locked;
}
