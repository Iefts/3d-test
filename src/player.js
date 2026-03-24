import * as THREE from 'three';
import { isKeyDown, consumeMouseDelta, isLocked } from './input.js';
import { PLAYER_HEIGHT } from './physics.js';

// States
const GROUNDED = 'GROUNDED';
const AIRBORNE = 'AIRBORNE';
const SLIDING = 'SLIDING';
const WALLRUNNING = 'WALLRUNNING';

// Tuning constants
const MOVE_SPEED = 12;
const MOVE_ACCEL = 40;
const AIR_ACCEL = 15;
const FRICTION = 8;
const AIR_FRICTION = 1;
const GRAVITY = -25;
const BASE_JUMP = 8;
const MAX_JUMP_BONUS = 5; // extra jump height at max momentum
const MOUSE_SENSITIVITY = 0.002;

// Momentum
const MOMENTUM_BUILD_RATE = 0.15;
const MOMENTUM_DECAY_RATE = 0.3;
const MOMENTUM_DECAY_IDLE = 0.5;

// Abilities
const SLIDE_SPEED_BOOST = 1.3;
const SLIDE_DURATION = 0.8;
const WALLRUN_DURATION = 1.5;
const WALLRUN_UP_SPEED = 3;
const DASH_DISTANCE = 8;
const DASH_SPEED = 30;
const BURST_SPEED = 50;
const BURST_COOLDOWN = 3;

export function createPlayer(scene, camera) {
  const player = {
    position: new THREE.Vector3(0, 3, 0),
    velocity: new THREE.Vector3(0, 0, 0),
    state: GROUNDED,
    momentum: 0,
    yaw: 0,
    pitch: 0,

    // Flags set by physics
    isGrounded: false,
    wallContact: null,

    // Ability state
    dashAvailable: true,
    slideTimer: 0,
    wallRunTimer: 0,
    wallRunNormal: null,
    burstCooldown: 0,

    // Checkpoint
    lastCheckpoint: { x: 0, y: 3, z: 0 },

    camera,
  };

  return player;
}

export function updatePlayer(player, delta) {
  if (!isLocked()) return;

  const p = player;

  // Mouse look
  const mouse = consumeMouseDelta();
  p.yaw -= mouse.dx * MOUSE_SENSITIVITY;
  p.pitch -= mouse.dy * MOUSE_SENSITIVITY;
  p.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, p.pitch));

  // Build movement direction from input
  const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  const wishDir = new THREE.Vector3(0, 0, 0);

  if (isKeyDown('KeyW')) wishDir.add(forward);
  if (isKeyDown('KeyS')) wishDir.sub(forward);
  if (isKeyDown('KeyD')) wishDir.add(right);
  if (isKeyDown('KeyA')) wishDir.sub(right);
  if (wishDir.lengthSq() > 0) wishDir.normalize();

  const isMoving = wishDir.lengthSq() > 0;
  const horizontalSpeed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.z * p.velocity.z);

  // State machine
  switch (p.state) {
    case GROUNDED:
      handleGrounded(p, delta, wishDir, isMoving, horizontalSpeed);
      break;
    case AIRBORNE:
      handleAirborne(p, delta, wishDir, isMoving, horizontalSpeed);
      break;
    case SLIDING:
      handleSliding(p, delta, wishDir, isMoving, horizontalSpeed);
      break;
    case WALLRUNNING:
      handleWallRunning(p, delta, wishDir, isMoving, horizontalSpeed);
      break;
  }

  // Gravity (not while wallrunning)
  if (p.state !== WALLRUNNING) {
    p.velocity.y += GRAVITY * delta;
  }

  // Momentum update
  updateMomentum(p, delta, isMoving, horizontalSpeed);

  // Burst cooldown
  if (p.burstCooldown > 0) p.burstCooldown -= delta;

  // Update camera
  const eyeHeight = p.state === SLIDING ? PLAYER_HEIGHT * 0.3 : PLAYER_HEIGHT * 0.45;
  p.camera.position.set(p.position.x, p.position.y + eyeHeight, p.position.z);
  p.camera.rotation.order = 'YXZ';
  p.camera.rotation.y = p.yaw;
  p.camera.rotation.x = p.pitch;
}

function handleGrounded(p, delta, wishDir, isMoving, hSpeed) {
  // Acceleration
  if (isMoving) {
    p.velocity.x += wishDir.x * MOVE_ACCEL * delta;
    p.velocity.z += wishDir.z * MOVE_ACCEL * delta;
  }

  // Friction
  const frictionFactor = 1 - FRICTION * delta;
  p.velocity.x *= Math.max(0, frictionFactor);
  p.velocity.z *= Math.max(0, frictionFactor);

  // Speed cap
  const speed = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.z * p.velocity.z);
  if (speed > MOVE_SPEED) {
    const scale = MOVE_SPEED / speed;
    p.velocity.x *= scale;
    p.velocity.z *= scale;
  }

  // Jump
  if (isKeyDown('Space')) {
    const jumpPower = BASE_JUMP + MAX_JUMP_BONUS * p.momentum;
    p.velocity.y = jumpPower;
    p.state = AIRBORNE;
    p.dashAvailable = true;
    return;
  }

  // Slide
  if ((isKeyDown('KeyC') || isKeyDown('ControlLeft') || isKeyDown('ControlRight')) && p.momentum >= 0.3 && hSpeed > 2) {
    p.state = SLIDING;
    p.slideTimer = SLIDE_DURATION;
    // Boost in movement direction
    const dir = new THREE.Vector3(p.velocity.x, 0, p.velocity.z).normalize();
    p.velocity.x = dir.x * hSpeed * SLIDE_SPEED_BOOST;
    p.velocity.z = dir.z * hSpeed * SLIDE_SPEED_BOOST;
    return;
  }

  // Burst
  if (isKeyDown('KeyQ') && p.momentum >= 0.9 && p.burstCooldown <= 0) {
    const dir = new THREE.Vector3(-Math.sin(p.yaw), 0.3, -Math.cos(p.yaw)).normalize();
    p.velocity.set(dir.x * BURST_SPEED, dir.y * BURST_SPEED, dir.z * BURST_SPEED);
    p.momentum -= 0.5;
    p.burstCooldown = BURST_COOLDOWN;
    p.state = AIRBORNE;
    p.dashAvailable = true;
    return;
  }

  // Transition to airborne if not on ground
  if (!p.isGrounded) {
    p.state = AIRBORNE;
    p.dashAvailable = true;
  }
}

function handleAirborne(p, delta, wishDir, isMoving, hSpeed) {
  // Air control
  if (isMoving) {
    p.velocity.x += wishDir.x * AIR_ACCEL * delta;
    p.velocity.z += wishDir.z * AIR_ACCEL * delta;
  }

  // Air friction (light)
  const frictionFactor = 1 - AIR_FRICTION * delta;
  p.velocity.x *= Math.max(0, frictionFactor);
  p.velocity.z *= Math.max(0, frictionFactor);

  // Wall run check
  if (isKeyDown('Space') && p.wallContact && p.momentum >= 0.5 && p.velocity.y < 2) {
    p.state = WALLRUNNING;
    p.wallRunTimer = WALLRUN_DURATION;
    p.wallRunNormal = p.wallContact.clone();
    p.velocity.y = WALLRUN_UP_SPEED;
    return;
  }

  // Air dash
  if (isKeyDown('ShiftLeft') && p.dashAvailable && p.momentum >= 0.7) {
    const dir = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    p.velocity.set(dir.x * DASH_SPEED, Math.max(p.velocity.y, 2), dir.z * DASH_SPEED);
    p.dashAvailable = false;
    p.momentum -= 0.2;
    return;
  }

  // Burst
  if (isKeyDown('KeyQ') && p.momentum >= 0.9 && p.burstCooldown <= 0) {
    const dir = new THREE.Vector3(-Math.sin(p.yaw), 0.3, -Math.cos(p.yaw)).normalize();
    p.velocity.set(dir.x * BURST_SPEED, dir.y * BURST_SPEED, dir.z * BURST_SPEED);
    p.momentum -= 0.5;
    p.burstCooldown = BURST_COOLDOWN;
    return;
  }

  // Landed
  if (p.isGrounded) {
    p.state = GROUNDED;
    p.dashAvailable = true;
  }
}

function handleSliding(p, delta, wishDir, isMoving, hSpeed) {
  p.slideTimer -= delta;

  // Low friction while sliding
  const frictionFactor = 1 - 2 * delta;
  p.velocity.x *= Math.max(0, frictionFactor);
  p.velocity.z *= Math.max(0, frictionFactor);

  // Exit slide
  if (p.slideTimer <= 0 || (!isKeyDown('KeyC') && !isKeyDown('ControlLeft') && !isKeyDown('ControlRight'))) {
    p.state = p.isGrounded ? GROUNDED : AIRBORNE;
    return;
  }

  // Can jump out of slide
  if (isKeyDown('Space')) {
    const jumpPower = BASE_JUMP + MAX_JUMP_BONUS * p.momentum;
    p.velocity.y = jumpPower;
    p.state = AIRBORNE;
    p.dashAvailable = true;
    return;
  }

  if (!p.isGrounded) {
    p.state = AIRBORNE;
  }
}

function handleWallRunning(p, delta, wishDir, isMoving, hSpeed) {
  p.wallRunTimer -= delta;
  p.velocity.y = Math.max(p.velocity.y - 3 * delta, -2); // Slowly lose altitude

  // Move along wall
  const wallTangent = new THREE.Vector3(-p.wallRunNormal.z, 0, p.wallRunNormal.x);
  const forward = new THREE.Vector3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
  const dot = forward.dot(wallTangent);
  const runDir = wallTangent.multiplyScalar(Math.sign(dot));

  p.velocity.x = runDir.x * MOVE_SPEED * 1.2;
  p.velocity.z = runDir.z * MOVE_SPEED * 1.2;

  // Exit: timer expired or no wall contact
  if (p.wallRunTimer <= 0 || !p.wallContact) {
    // Kick off the wall
    p.velocity.x += p.wallRunNormal.x * 6;
    p.velocity.y = BASE_JUMP * 0.8;
    p.velocity.z += p.wallRunNormal.z * 6;
    p.state = AIRBORNE;
    p.dashAvailable = true;
    return;
  }

  // Jump off wall
  if (!isKeyDown('Space')) {
    p.velocity.x += p.wallRunNormal.x * 8;
    p.velocity.y = BASE_JUMP;
    p.velocity.z += p.wallRunNormal.z * 8;
    p.state = AIRBORNE;
    p.dashAvailable = true;
    return;
  }
}

function updateMomentum(p, delta, isMoving, horizontalSpeed) {
  if (isMoving && horizontalSpeed > 2) {
    // Build momentum while moving fast
    const buildRate = MOMENTUM_BUILD_RATE * (horizontalSpeed / MOVE_SPEED);
    p.momentum = Math.min(1, p.momentum + buildRate * delta);
  } else if (horizontalSpeed < 1) {
    // Decay when nearly still
    p.momentum = Math.max(0, p.momentum - MOMENTUM_DECAY_IDLE * delta);
  } else {
    // Slow decay when moving slowly
    p.momentum = Math.max(0, p.momentum - MOMENTUM_DECAY_RATE * delta);
  }

  // Bonus momentum from wallrunning
  if (p.state === WALLRUNNING) {
    p.momentum = Math.min(1, p.momentum + 0.3 * delta);
  }

  // Clamp
  p.momentum = Math.max(0, Math.min(1, p.momentum));
}
