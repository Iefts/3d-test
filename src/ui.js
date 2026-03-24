import { HOTBAR_BLOCKS, BLOCK_DATA } from './blocks.js';

let debugEl;
let timeEl;
let slots = [];

export function initUI() {
  debugEl = document.getElementById('debug');
  timeEl = document.getElementById('time-display');

  // Build hotbar
  const hotbar = document.getElementById('hotbar');
  hotbar.innerHTML = '';

  for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';

    const num = document.createElement('span');
    num.className = 'slot-num';
    num.textContent = i + 1;
    slot.appendChild(num);

    if (i < HOTBAR_BLOCKS.length) {
      const preview = document.createElement('div');
      preview.className = 'block-preview';
      const color = BLOCK_DATA[HOTBAR_BLOCKS[i]]?.color ?? 0x000000;
      preview.style.background = '#' + color.toString(16).padStart(6, '0');
      slot.appendChild(preview);
    }

    hotbar.appendChild(slot);
    slots.push(slot);
  }
}

export function updateUI(player, atmosphere, world) {
  // Hotbar selection
  for (let i = 0; i < slots.length; i++) {
    slots[i].className = i === player.selectedSlot ? 'hotbar-slot selected' : 'hotbar-slot';
  }

  // Debug info
  if (debugEl) {
    const p = player.position;
    const block = HOTBAR_BLOCKS[player.selectedSlot];
    const blockName = BLOCK_DATA[block]?.name ?? '?';
    debugEl.innerHTML =
      `XYZ: ${p.x.toFixed(1)} / ${p.y.toFixed(1)} / ${p.z.toFixed(1)}<br>` +
      `Block: ${blockName}<br>` +
      `Chunks: ${world.chunks.size}`;
  }

  // Time
  if (timeEl && atmosphere) {
    timeEl.textContent = atmosphere.getTimeString();
  }
}
