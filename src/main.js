import * as THREE from 'three';
import { initInput, updateInput } from './input.js';
import { initAtmosphere } from './atmosphere.js';
import { initPhysics, updatePhysics } from './physics.js';
import { createPlayer, updatePlayer } from './player.js';
import { initLevel } from './level.js';
import { initUI, updateUI } from './ui.js';

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
document.body.appendChild(renderer.domElement);

// Scene & Camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 600);

// Init systems
initInput();
const composer = initAtmosphere(scene, renderer, camera);
const { colliders, checkpoints } = initLevel(scene);
const player = createPlayer(scene, camera);
initPhysics(colliders, player);
initUI();

// Checkpoint tracking
let currentCheckpoint = 0;

// Game loop
let lastTime = performance.now();

function gameLoop(now) {
  requestAnimationFrame(gameLoop);

  const delta = Math.min((now - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = now;

  updateInput();
  updatePlayer(player, delta);
  updatePhysics(delta);

  // Check checkpoint progression
  for (let i = currentCheckpoint + 1; i < checkpoints.length; i++) {
    const cp = checkpoints[i];
    const dx = player.position.x - cp.x;
    const dz = player.position.z - cp.z;
    if (dx * dx + dz * dz < 25) { // within 5 units
      currentCheckpoint = i;
      player.lastCheckpoint = { x: cp.x, y: cp.y, z: cp.z };
    }
  }

  updateUI(player);
  composer.render();
}

requestAnimationFrame(gameLoop);

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
