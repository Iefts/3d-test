import * as THREE from 'three';

// Colors — earthy, muted Valheim palette
const STONE = 0x7a7d80;
const STONE_DARK = 0x5c5f62;
const WOOD = 0x8b6f47;
const WOOD_LIGHT = 0xa0855c;
const GRASS = 0x5a7247;
const MOSS = 0x6b6e5c;
const ACCENT = 0xc4956a;
const DANGER = 0x8b4040;
const GOLD = 0xd4a843;

// Platform definitions: [x, y, z, width, height, depth, color]
const PLATFORM_DEFS = [
  // === SECTION 1: THE MEADOW (learn basics) ===
  // Starting platform — wide and safe
  [0, 0, 0, 12, 1, 12, GRASS],
  // Second platform
  [0, -0.3, -16, 10, 1, 10, GRASS],
  // Third platform — slight rise
  [0, 0.5, -30, 9, 1, 9, GRASS],

  // === SECTION 2: THE RAVINE (sliding + momentum jumps) ===
  // Narrow bridge to the ravine
  [0, 1, -42, 5, 1, 6, STONE],
  // Platform requiring momentum to reach (longer gap)
  [0, 0.5, -54, 7, 1, 7, STONE],
  // Low overhang ceiling — must slide under
  [0, 3.2, -61, 7, 1.5, 3, STONE_DARK],
  // Platform after overhang
  [0, 0.5, -66, 7, 1, 6, STONE],
  // Side route shortcut (narrow, requires air dash) — elevated
  [8, 3, -60, 2, 0.5, 2, ACCENT],
  // Landing pad for shortcut
  [8, 2.5, -74, 3, 0.5, 3, ACCENT],

  // === SECTION 3: THE WALL (wall-running) ===
  // Pre-wall platform
  [0, 1, -78, 6, 1, 6, STONE],
  // Left wall for wall-running
  [-4, 6, -88, 1, 12, 16, STONE_DARK],
  // Right wall for wall-running
  [4, 6, -88, 1, 12, 16, STONE_DARK],
  // Wall-run target platform (must wall-run right wall to reach)
  [0, 2, -100, 6, 1, 6, WOOD],
  // Lower alternative path
  [-6, -3, -85, 3, 0.5, 3, MOSS],
  [-6, -3, -91, 3, 0.5, 3, MOSS],
  [-6, -3, -97, 3, 0.5, 3, MOSS],
  [0, -2, -100, 4, 0.5, 4, MOSS],

  // === SECTION 4: THE GAUNTLET (chain everything) ===
  // Series of small platforms
  [0, 2.5, -110, 3, 0.5, 3, WOOD],
  [3, 4, -116, 2.5, 0.5, 2.5, WOOD],
  // Wall for mid-gauntlet wall-run
  [6, 7, -122, 1, 8, 10, STONE_DARK],
  // Landing after wall-run
  [3, 5, -128, 2.5, 0.5, 2.5, WOOD_LIGHT],
  // Low barrier — slide under
  [3, 7.2, -132, 4, 1, 2, STONE_DARK],
  // Platform after barrier
  [3, 5, -135, 3, 0.5, 3, WOOD],
  // Jump to final section
  [0, 5.5, -142, 3, 0.5, 3, WOOD_LIGHT],

  // === SECTION 5: THE FINALE (momentum burst) ===
  // Launch pad
  [0, 6, -150, 5, 1, 5, ACCENT],
  // Massive gap — then finish platform (needs burst or lower path)
  [0, 6, -178, 8, 1, 8, GOLD],
  // Lower winding path
  [-5, 2, -155, 2.5, 0.5, 2.5, MOSS],
  [-8, 1, -160, 2.5, 0.5, 2.5, MOSS],
  [-5, 0, -165, 2.5, 0.5, 2.5, MOSS],
  [-2, -0.5, -170, 2.5, 0.5, 2.5, MOSS],
  [0, 0, -175, 3, 0.5, 3, MOSS],
  // Ramp up to finish
  [0, 3, -177, 4, 6, 1, STONE],
];

// Checkpoint positions
const CHECKPOINTS = [
  { x: 0, y: 3, z: 0 },
  { x: 0, y: 3.5, z: -54 },
  { x: 0, y: 4, z: -100 },
  { x: 0, y: 5.5, z: -110 },
  { x: 0, y: 9, z: -150 },
];

export function initLevel(scene) {
  const colliders = [];

  // Create platforms
  for (const def of PLATFORM_DEFS) {
    const [x, y, z, w, h, d, color] = def;
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    colliders.push({
      position: new THREE.Vector3(x, y, z),
      halfSize: new THREE.Vector3(w / 2, h / 2, d / 2),
    });
  }

  // Decorative rocks (no collision)
  addRocks(scene);

  // Decorative trees (no collision)
  addTrees(scene);

  // Checkpoint markers
  addCheckpointMarkers(scene);

  // Ground plane far below (visual only)
  const groundGeo = new THREE.PlaneGeometry(400, 400);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x3a4a30,
    roughness: 0.95,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -25;
  ground.receiveShadow = true;
  scene.add(ground);

  return { colliders, checkpoints: CHECKPOINTS };
}

function addRocks(scene) {
  const rockGeo = new THREE.IcosahedronGeometry(1, 0);
  // Displace vertices for organic look
  const positions = rockGeo.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    positions.setX(i, positions.getX(i) * (0.7 + Math.random() * 0.6));
    positions.setY(i, positions.getY(i) * (0.5 + Math.random() * 0.5));
    positions.setZ(i, positions.getZ(i) * (0.7 + Math.random() * 0.6));
  }
  rockGeo.computeVertexNormals();

  const rockMat = new THREE.MeshStandardMaterial({
    color: STONE,
    roughness: 0.9,
    metalness: 0.0,
  });

  const rockPositions = [
    [6, 0.3, -2], [-5, 0.2, -4], [5, -0.1, -18],
    [-4, 0.7, -28], [4, 1.3, -40], [-3, 1.5, -76],
    [2, 6.3, -148], [-3, 6.2, -152],
  ];

  for (const [x, y, z] of rockPositions) {
    const rock = new THREE.Mesh(rockGeo, rockMat);
    const scale = 0.5 + Math.random() * 1;
    rock.scale.set(scale, scale * 0.6, scale);
    rock.position.set(x, y, z);
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.castShadow = true;
    scene.add(rock);
  }
}

function addTrees(scene) {
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 2, 6);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x5c4a32,
    roughness: 0.9,
  });
  const foliageGeo = new THREE.ConeGeometry(1.2, 2.5, 6);
  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x4a6638,
    roughness: 0.85,
  });

  const treePositions = [
    [8, 0.5, 3], [-7, 0.5, 1], [9, 0.5, -12],
    [-8, 0.5, -20], [7, 0.5, -32], [-7, 1.5, -45],
    [8, 1.5, -75], [-8, 1.5, -105],
  ];

  for (const [x, y, z] of treePositions) {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1;
    trunk.castShadow = true;
    group.add(trunk);

    const foliage = new THREE.Mesh(foliageGeo, foliageMat);
    foliage.position.y = 3;
    foliage.castShadow = true;
    group.add(foliage);

    const scale = 0.8 + Math.random() * 0.6;
    group.scale.set(scale, scale, scale);
    group.position.set(x, y, z);
    scene.add(group);
  }
}

function addCheckpointMarkers(scene) {
  const markerGeo = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
  const markerMat = new THREE.MeshStandardMaterial({
    color: ACCENT,
    roughness: 0.5,
    emissive: ACCENT,
    emissiveIntensity: 0.3,
  });

  for (const cp of CHECKPOINTS) {
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(cp.x + 2, cp.y - 1, cp.z);
    marker.castShadow = true;
    scene.add(marker);
  }
}
