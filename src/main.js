import * as THREE from 'three';
import { initInput } from './input.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Atmosphere } from './atmosphere.js';
import { BlockHighlight } from './highlight.js';
import { initUI, updateUI } from './ui.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
document.body.appendChild(renderer.domElement);

// Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 600);

// Init systems
initInput();
const world = new World(scene);
const player = new Player(camera);
const atmosphere = new Atmosphere(scene);
const highlight = new BlockHighlight(scene);
initUI();

// Spawn player above terrain
world.update(0, 0);
// Wait a frame for chunks to generate, then find spawn height
setTimeout(() => {
  for (let y = 60; y > 0; y--) {
    const block = world.getBlock(0, y, 0);
    if (block !== 0) {
      player.position.y = y + 2;
      break;
    }
  }
}, 0);

// Game loop
let lastTime = performance.now();

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  player.update(delta, world);
  world.update(player.position.x, player.position.z);
  atmosphere.update(delta, player.position);

  // Block highlight
  const hit = player.getTargetBlock(world);
  highlight.update(hit);

  updateUI(player, atmosphere, world);
  renderer.render(scene, camera);
}

requestAnimationFrame(gameLoop);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
