import * as THREE from 'three';

let platforms = [];
let playerRef = null;

const _tempBox = new THREE.Box3();
const _tempPlayerBox = new THREE.Box3();
const PLAYER_RADIUS = 0.35;
const PLAYER_HEIGHT = 1.7;
const GROUND_RAY = new THREE.Raycaster();
const WALL_RAY = new THREE.Raycaster();

export function initPhysics(platformList, player) {
  platforms = platformList;
  playerRef = player;
}

export function updatePhysics(delta) {
  const p = playerRef;
  if (!p) return;

  // Apply velocity
  p.position.x += p.velocity.x * delta;
  p.position.y += p.velocity.y * delta;
  p.position.z += p.velocity.z * delta;

  // Reset ground/wall flags
  p.isGrounded = false;
  p.wallContact = null;

  // Player AABB
  const halfW = PLAYER_RADIUS;
  const halfH = PLAYER_HEIGHT / 2;
  _tempPlayerBox.min.set(
    p.position.x - halfW,
    p.position.y - halfH,
    p.position.z - halfW
  );
  _tempPlayerBox.max.set(
    p.position.x + halfW,
    p.position.y + halfH,
    p.position.z + halfW
  );

  // Collision with platforms
  for (const plat of platforms) {
    _tempBox.min.set(
      plat.position.x - plat.halfSize.x,
      plat.position.y - plat.halfSize.y,
      plat.position.z - plat.halfSize.z
    );
    _tempBox.max.set(
      plat.position.x + plat.halfSize.x,
      plat.position.y + plat.halfSize.y,
      plat.position.z + plat.halfSize.z
    );

    if (!_tempPlayerBox.intersectsBox(_tempBox)) continue;

    // Compute overlap on each axis
    const overlapX = Math.min(
      _tempPlayerBox.max.x - _tempBox.min.x,
      _tempBox.max.x - _tempPlayerBox.min.x
    );
    const overlapY = Math.min(
      _tempPlayerBox.max.y - _tempBox.min.y,
      _tempBox.max.y - _tempPlayerBox.min.y
    );
    const overlapZ = Math.min(
      _tempPlayerBox.max.z - _tempBox.min.z,
      _tempBox.max.z - _tempPlayerBox.min.z
    );

    // Push out along minimum overlap axis
    if (overlapY <= overlapX && overlapY <= overlapZ) {
      // Vertical collision
      if (p.position.y > plat.position.y) {
        // Landing on top
        p.position.y += overlapY;
        if (p.velocity.y < 0) p.velocity.y = 0;
        p.isGrounded = true;
      } else {
        // Hitting from below
        p.position.y -= overlapY;
        if (p.velocity.y > 0) p.velocity.y = 0;
      }
    } else if (overlapX <= overlapZ) {
      // X-axis wall collision
      const dir = p.position.x > plat.position.x ? 1 : -1;
      p.position.x += overlapX * dir;
      p.velocity.x = 0;
      p.wallContact = new THREE.Vector3(dir, 0, 0);
    } else {
      // Z-axis wall collision
      const dir = p.position.z > plat.position.z ? 1 : -1;
      p.position.z += overlapZ * dir;
      p.velocity.z = 0;
      p.wallContact = new THREE.Vector3(0, 0, dir);
    }

    // Recompute player box after correction
    _tempPlayerBox.min.set(
      p.position.x - halfW,
      p.position.y - halfH,
      p.position.z - halfW
    );
    _tempPlayerBox.max.set(
      p.position.x + halfW,
      p.position.y + halfH,
      p.position.z + halfW
    );
  }

  // Kill plane — respawn
  if (p.position.y < -20) {
    respawnPlayer(p);
  }
}

function respawnPlayer(p) {
  // Find nearest previous checkpoint
  const cp = p.lastCheckpoint || { x: 0, y: 3, z: 0 };
  p.position.set(cp.x, cp.y, cp.z);
  p.velocity.set(0, 0, 0);
  p.momentum = 0;
}

export { PLAYER_HEIGHT, PLAYER_RADIUS };
