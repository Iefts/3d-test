import * as THREE from 'three';
import { AIR, BLOCK_DATA, WATER } from './blocks.js';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

export class Chunk {
  constructor(cx, cz) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    this.mesh = null;
    this.waterMesh = null;
    this.dirty = true;
  }

  getIndex(x, y, z) {
    return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
  }

  getBlock(x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return AIR;
    }
    return this.blocks[this.getIndex(x, y, z)];
  }

  setBlock(x, y, z, type) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) return;
    this.blocks[this.getIndex(x, y, z)] = type;
    this.dirty = true;
  }

  buildMesh(getNeighborBlock) {
    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];

    const waterPositions = [];
    const waterNormals = [];
    const waterColors = [];
    const waterIndices = [];

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const block = this.getBlock(x, y, z);
          if (block === AIR) continue;

          const data = BLOCK_DATA[block];
          if (!data) continue;

          const isWater = block === WATER;
          const targetPositions = isWater ? waterPositions : positions;
          const targetNormals = isWater ? waterNormals : normals;
          const targetColors = isWater ? waterColors : colors;
          const targetIndices = isWater ? waterIndices : indices;

          const wx = this.cx * CHUNK_SIZE + x;
          const wz = this.cz * CHUNK_SIZE + z;

          // Check each face
          const faces = [
            { dir: [0, 1, 0],  corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], colorKey: 'topColor' },    // top
            { dir: [0,-1, 0],  corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], colorKey: 'bottomColor' },  // bottom
            { dir: [0, 0, 1],  corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], colorKey: 'sideColor' },    // front
            { dir: [0, 0,-1],  corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], colorKey: 'sideColor' },    // back
            { dir: [1, 0, 0],  corners: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]], colorKey: 'sideColor' },    // right
            { dir: [-1, 0, 0], corners: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]], colorKey: 'sideColor' },    // left
          ];

          for (const face of faces) {
            const [dx, dy, dz] = face.dir;
            const nx = x + dx;
            const ny = y + dy;
            const nz = z + dz;

            let neighbor;
            if (nx < 0 || nx >= CHUNK_SIZE || nz < 0 || nz >= CHUNK_SIZE) {
              neighbor = getNeighborBlock(wx + dx, ny, wz + dz);
            } else if (ny < 0 || ny >= CHUNK_HEIGHT) {
              neighbor = AIR;
            } else {
              neighbor = this.getBlock(nx, ny, nz);
            }

            const neighborData = BLOCK_DATA[neighbor];
            // Show face if neighbor is air or transparent (and not same type for water)
            if (neighbor === block) continue;
            if (neighborData && !neighborData.transparent) continue;
            if (isWater && neighbor !== AIR) continue;

            const baseIndex = targetPositions.length / 3;
            const faceColor = data[face.colorKey] || data.color;
            const c = new THREE.Color(faceColor);

            for (const corner of face.corners) {
              targetPositions.push(x + corner[0], y + corner[1], z + corner[2]);
              targetNormals.push(dx, dy, dz);
              targetColors.push(c.r, c.g, c.b);
            }

            targetIndices.push(
              baseIndex, baseIndex + 1, baseIndex + 2,
              baseIndex, baseIndex + 2, baseIndex + 3
            );
          }
        }
      }
    }

    // Dispose old meshes
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.geometry = null;
    }
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      this.waterMesh.geometry = null;
    }

    // Solid mesh
    if (positions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geo.setIndex(indices);

      if (!this.mesh) {
        const mat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.85,
          metalness: 0.0,
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
      } else {
        this.mesh.geometry = geo;
      }
      this.mesh.position.set(this.cx * CHUNK_SIZE, 0, this.cz * CHUNK_SIZE);
    }

    // Water mesh
    if (waterPositions.length > 0) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(waterColors, 3));
      geo.setIndex(waterIndices);

      if (!this.waterMesh) {
        const mat = new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.3,
          metalness: 0.1,
          transparent: true,
          opacity: 0.6,
          side: THREE.DoubleSide,
        });
        this.waterMesh = new THREE.Mesh(geo, mat);
      } else {
        this.waterMesh.geometry = geo;
      }
      this.waterMesh.position.set(this.cx * CHUNK_SIZE, 0, this.cz * CHUNK_SIZE);
    }

    this.dirty = false;
  }
}
