const keys = new Map();
let mouseDX = 0;
let mouseDY = 0;
let locked = false;
let leftClick = false;
let rightClick = false;
let scrollDelta = 0;

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

  document.addEventListener('mousedown', (e) => {
    if (!locked) {
      document.body.requestPointerLock();
      return;
    }
    if (e.button === 0) leftClick = true;
    if (e.button === 2) rightClick = true;
  });

  document.addEventListener('contextmenu', (e) => e.preventDefault());

  document.addEventListener('wheel', (e) => {
    if (!locked) return;
    scrollDelta += Math.sign(e.deltaY);
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === document.body;
    const prompt = document.getElementById('prompt');
    if (prompt) prompt.style.display = locked ? 'none' : 'block';
  });
}

export function consumeMouseDelta() {
  const dx = mouseDX;
  const dy = mouseDY;
  mouseDX = 0;
  mouseDY = 0;
  return { dx, dy };
}

export function consumeLeftClick() {
  const v = leftClick;
  leftClick = false;
  return v;
}

export function consumeRightClick() {
  const v = rightClick;
  rightClick = false;
  return v;
}

export function consumeScroll() {
  const v = scrollDelta;
  scrollDelta = 0;
  return v;
}

export function isKeyDown(code) {
  return keys.get(code) === true;
}

export function isLocked() {
  return locked;
}
