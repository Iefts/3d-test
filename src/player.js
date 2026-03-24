import * as THREE from 'three';
import { isKeyDown, consumeMouseDelta, isLocked, consumeLeftClick, consumeRightClick, consumeScroll } from './input.js';
import { BLOCK_DATA, AIR, HOTBAR_BLOCKS } from './blocks.js';

const MOUSE_SENSITIVITY = 0.002;
const WALK_SPEED = 4.3;
const SPRINT_SPEED = 5.6;
const JUMP_VELOCITY = 8;
const GRAVITY = -24;
const PLAYER_HEIGHT = 1.62;
const PLAYER_WIDTH = 0.6;
const EYE_HEIGHT = 1.52;

export class Player {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, 40, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.isGrounded = false;
    this.selectedSlot = 0;
    this.isSprinting = false;

    // Block break/place cooldown
    this.breakCooldown = 0;
    this.placeCooldown = 0;
  }

  update(delta, world) {
    if (!isLocked()) return;

    // Mouse look
    const mouse = consumeMouseDelta();
    this.yaw -= mouse.dx * MOUSE_SENSITIVITY;
    this.pitch -= mouse.dy * MOUSE_SENSITIVITY;
    this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));

    // Movement input
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const wishDir = new THREE.Vector3(0, 0, 0);

    if (isKeyDown('KeyW')) wishDir.add(forward);
    if (isKeyDown('KeyS')) wishDir.sub(forward);
    if (isKeyDown('KeyD')) wishDir.add(right);
    if (isKeyDown('KeyA')) wishDir.sub(right);

    // Sprint
    this.isSprinting = isKeyDown('ShiftLeft') && isKeyDown('KeyW');
    const speed = this.isSprinting ? SPRINT_SPEED : WALK_SPEED;

    if (wishDir.lengthSq() > 0) {
      wishDir.normalize();
      this.velocity.x = wishDir.x * speed;
      this.velocity.z = wishDir.z * speed;
    } else {
      this.velocity.x *= 0.8;
      this.velocity.z *= 0.8;
      if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
      if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
    }

    // Gravity
    this.velocity.y += GRAVITY * delta;

    // Jump
    if (isKeyDown('Space') && this.isGrounded) {
      this.velocity.y = JUMP_VELOCITY;
      this.isGrounded = false;
    }

    // Apply movement with collision
    this.moveWithCollision(delta, world);

    // Hotbar selection
    for (let i = 0; i < 9; i++) {
      if (isKeyDown(`Digit${i + 1}`)) {
        this.selectedSlot = i;
      }
    }
    const scroll = consumeScroll();
    if (scroll !== 0) {
      this.selectedSlot = ((this.selectedSlot + scroll) % 9 + 9) % 9;
    }

    // Block interaction
    this.breakCooldown -= delta;
    this.placeCooldown -= delta;

    if (consumeLeftClick() && this.breakCooldown <= 0) {
      this.breakBlock(world);
      this.breakCooldown = 0.25;
    }

    if (consumeRightClick() && this.placeCooldown <= 0) {
      this.placeBlock(world);
      this.placeCooldown = 0.25;
    }

    // Update camera
    this.camera.position.set(
      this.position.x,
      this.position.y + EYE_HEIGHT,
      this.position.z
    );
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  moveWithCollision(delta, world) {
    const halfW = PLAYER_WIDTH / 2;
    const steps = 3; // split movement into steps for better collision

    // Move on each axis separately
    for (let axis of ['x', 'y', 'z']) {
      const move = this.velocity[axis] * delta;
      this.position[axis] += move;

      // Check collision
      if (this.checkCollision(world, halfW)) {
        this.position[axis] -= move;
        if (axis === 'y') {
          if (this.velocity.y < 0) this.isGrounded = true;
          this.velocity.y = 0;
        }
      }
    }

    // Extra ground check
    if (!this.isGrounded) {
      const feetY = this.position.y - 0.05;
      for (let dx of [-halfW + 0.01, halfW - 0.01]) {
        for (let dz of [-halfW + 0.01, halfW - 0.01]) {
          const bx = Math.floor(this.position.x + dx);
          const by = Math.floor(feetY);
          const bz = Math.floor(this.position.z + dz);
          const block = world.getBlock(bx, by, bz);
          if (BLOCK_DATA[block]?.solid) {
            this.isGrounded = true;
            break;
          }
        }
        if (this.isGrounded) break;
      }
    }
  }

  checkCollision(world, halfW) {
    const minX = Math.floor(this.position.x - halfW);
    const maxX = Math.floor(this.position.x + halfW);
    const minY = Math.floor(this.position.y);
    const maxY = Math.floor(this.position.y + PLAYER_HEIGHT);
    const minZ = Math.floor(this.position.z - halfW);
    const maxZ = Math.floor(this.position.z + halfW);

    for (let bx = minX; bx <= maxX; bx++) {
      for (let by = minY; by <= maxY; by++) {
        for (let bz = minZ; bz <= maxZ; bz++) {
          const block = world.getBlock(bx, by, bz);
          if (BLOCK_DATA[block]?.solid) {
            return true;
          }
        }
      }
    }
    return false;
  }

  getLookDirection() {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return dir;
  }

  breakBlock(world) {
    const origin = new THREE.Vector3(
      this.position.x,
      this.position.y + EYE_HEIGHT,
      this.position.z
    );
    const hit = world.raycast(origin, this.getLookDirection());
    if (hit) {
      world.setBlock(hit.x, hit.y, hit.z, AIR);
    }
  }

  placeBlock(world) {
    const origin = new THREE.Vector3(
      this.position.x,
      this.position.y + EYE_HEIGHT,
      this.position.z
    );
    const hit = world.raycast(origin, this.getLookDirection());
    if (hit) {
      const blockType = HOTBAR_BLOCKS[this.selectedSlot];
      if (blockType === undefined) return;

      // Don't place inside the player
      const px = hit.placeX;
      const py = hit.placeY;
      const pz = hit.placeZ;
      const halfW = PLAYER_WIDTH / 2;
      const playerMinX = this.position.x - halfW;
      const playerMaxX = this.position.x + halfW;
      const playerMinY = this.position.y;
      const playerMaxY = this.position.y + PLAYER_HEIGHT;
      const playerMinZ = this.position.z - halfW;
      const playerMaxZ = this.position.z + halfW;

      if (px + 1 > playerMinX && px < playerMaxX &&
          py + 1 > playerMinY && py < playerMaxY &&
          pz + 1 > playerMinZ && pz < playerMaxZ) {
        return;
      }

      world.setBlock(px, py, pz, blockType);
    }
  }

  getTargetBlock(world) {
    const origin = new THREE.Vector3(
      this.position.x,
      this.position.y + EYE_HEIGHT,
      this.position.z
    );
    return world.raycast(origin, this.getLookDirection());
  }
}
