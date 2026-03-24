import * as THREE from 'three';
import { SimplexNoise } from './noise.js';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './chunk.js';
import { AIR, GRASS, DIRT, STONE, SAND, WATER, WOOD, LEAVES, BEDROCK, SNOW } from './blocks.js';

const RENDER_DISTANCE = 6;
const WATER_LEVEL = 20;
const noise = new SimplexNoise(42);
const noise2 = new SimplexNoise(137);

export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = new Map();
    this.pendingChunks = [];
  }

  chunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  getChunk(cx, cz) {
    return this.chunks.get(this.chunkKey(cx, cz));
  }

  getBlock(wx, wy, wz) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return AIR;
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    return chunk.getBlock(lx, wy, lz);
  }

  setBlock(wx, wy, wz, type) {
    const cx = Math.floor(wx / CHUNK_SIZE);
    const cz = Math.floor(wz / CHUNK_SIZE);
    const chunk = this.getChunk(cx, cz);
    if (!chunk) return;
    const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    chunk.setBlock(lx, wy, lz, type);
    chunk.dirty = true;

    // Mark neighbor chunks dirty if on edge
    if (lx === 0) this._markDirty(cx - 1, cz);
    if (lx === CHUNK_SIZE - 1) this._markDirty(cx + 1, cz);
    if (lz === 0) this._markDirty(cx, cz - 1);
    if (lz === CHUNK_SIZE - 1) this._markDirty(cx, cz + 1);
  }

  _markDirty(cx, cz) {
    const chunk = this.getChunk(cx, cz);
    if (chunk) chunk.dirty = true;
  }

  isSolid(wx, wy, wz) {
    const block = this.getBlock(wx, wy, wz);
    return BLOCK_DATA[block]?.solid ?? false;
  }

  update(playerX, playerZ) {
    const pcx = Math.floor(playerX / CHUNK_SIZE);
    const pcz = Math.floor(playerZ / CHUNK_SIZE);

    // Generate new chunks within render distance
    for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        if (dx * dx + dz * dz > RENDER_DISTANCE * RENDER_DISTANCE) continue;
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = this.chunkKey(cx, cz);
        if (!this.chunks.has(key)) {
          const chunk = new Chunk(cx, cz);
          this.generateTerrain(chunk);
          this.chunks.set(key, chunk);
          chunk.dirty = true;
        }
      }
    }

    // Rebuild dirty chunks (limit per frame for performance)
    let rebuilt = 0;
    const getNeighborBlock = (wx, wy, wz) => this.getBlock(wx, wy, wz);

    for (const [key, chunk] of this.chunks) {
      if (!chunk.dirty) continue;
      if (rebuilt >= 3) break; // Max 3 chunk rebuilds per frame

      chunk.buildMesh(getNeighborBlock);
      rebuilt++;

      if (chunk.mesh && !chunk.mesh.parent) {
        this.scene.add(chunk.mesh);
      }
      if (chunk.waterMesh && !chunk.waterMesh.parent) {
        this.scene.add(chunk.waterMesh);
      }
    }

    // Remove far chunks
    for (const [key, chunk] of this.chunks) {
      const dx = chunk.cx - pcx;
      const dz = chunk.cz - pcz;
      if (dx * dx + dz * dz > (RENDER_DISTANCE + 2) * (RENDER_DISTANCE + 2)) {
        if (chunk.mesh) {
          this.scene.remove(chunk.mesh);
          chunk.mesh.geometry.dispose();
        }
        if (chunk.waterMesh) {
          this.scene.remove(chunk.waterMesh);
          chunk.waterMesh.geometry.dispose();
        }
        this.chunks.delete(key);
      }
    }
  }

  generateTerrain(chunk) {
    const cx = chunk.cx;
    const cz = chunk.cz;

    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const wx = cx * CHUNK_SIZE + lx;
        const wz = cz * CHUNK_SIZE + lz;

        // Multi-octave height
        const baseHeight = noise.fbm(wx * 0.005, wz * 0.005, 5, 2, 0.5);
        const detail = noise.fbm(wx * 0.02, wz * 0.02, 3, 2, 0.5);
        const mountainFactor = Math.max(0, noise.fbm(wx * 0.003, wz * 0.003, 3, 2, 0.5));

        let height = 25 + baseHeight * 15 + detail * 5 + mountainFactor * mountainFactor * 30;
        height = Math.floor(height);
        height = Math.max(1, Math.min(CHUNK_HEIGHT - 1, height));

        // Determine biome
        const temp = noise2.fbm(wx * 0.003, wz * 0.003, 2, 2, 0.5);
        const isBeach = height <= WATER_LEVEL + 2 && height >= WATER_LEVEL - 1;
        const isSnowy = temp < -0.3 && height > 35;

        // Fill column
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y === 0) {
            chunk.setBlock(lx, y, lz, BEDROCK);
          } else if (y < height - 4) {
            chunk.setBlock(lx, y, lz, STONE);
          } else if (y < height) {
            chunk.setBlock(lx, y, lz, isBeach ? SAND : DIRT);
          } else if (y === height) {
            if (isBeach) {
              chunk.setBlock(lx, y, lz, SAND);
            } else if (isSnowy) {
              chunk.setBlock(lx, y, lz, SNOW);
            } else {
              chunk.setBlock(lx, y, lz, GRASS);
            }
          } else if (y <= WATER_LEVEL && y > height) {
            chunk.setBlock(lx, y, lz, WATER);
          }
        }

        // Trees
        if (height > WATER_LEVEL + 1 && !isBeach && !isSnowy && height < 40) {
          const treeNoise = noise.noise2D(wx * 0.5, wz * 0.5);
          if (treeNoise > 0.7 && lx > 2 && lx < CHUNK_SIZE - 3 && lz > 2 && lz < CHUNK_SIZE - 3) {
            this.placeTree(chunk, lx, height + 1, lz);
          }
        }
      }
    }
  }

  placeTree(chunk, x, y, z) {
    const trunkHeight = 4 + Math.floor(Math.random() * 3);

    // Trunk
    for (let i = 0; i < trunkHeight; i++) {
      if (y + i < CHUNK_HEIGHT) {
        chunk.setBlock(x, y + i, z, WOOD);
      }
    }

    // Leaves
    const leafStart = y + trunkHeight - 2;
    const leafEnd = y + trunkHeight + 1;
    for (let ly = leafStart; ly <= leafEnd; ly++) {
      const radius = ly < leafEnd ? 2 : 1;
      for (let lx = -radius; lx <= radius; lx++) {
        for (let lz = -radius; lz <= radius; lz++) {
          if (Math.abs(lx) === radius && Math.abs(lz) === radius) continue; // round corners
          if (lx === 0 && lz === 0 && ly < y + trunkHeight) continue; // trunk space
          const bx = x + lx;
          const bz = z + lz;
          if (bx >= 0 && bx < CHUNK_SIZE && bz >= 0 && bz < CHUNK_SIZE && ly < CHUNK_HEIGHT) {
            if (chunk.getBlock(bx, ly, bz) === AIR) {
              chunk.setBlock(bx, ly, bz, LEAVES);
            }
          }
        }
      }
    }
  }

  // Raycast into world for block selection
  raycast(origin, direction, maxDist = 8) {
    const step = 0.05;
    const pos = origin.clone();
    const dir = direction.clone().normalize().multiplyScalar(step);
    let prevX = Math.floor(pos.x);
    let prevY = Math.floor(pos.y);
    let prevZ = Math.floor(pos.z);

    for (let i = 0; i < maxDist / step; i++) {
      pos.add(dir);
      const bx = Math.floor(pos.x);
      const by = Math.floor(pos.y);
      const bz = Math.floor(pos.z);

      if (bx !== prevX || by !== prevY || bz !== prevZ) {
        const block = this.getBlock(bx, by, bz);
        if (block !== AIR && block !== WATER) {
          return {
            x: bx, y: by, z: bz,
            block,
            placeX: prevX, placeY: prevY, placeZ: prevZ,
          };
        }
        prevX = bx;
        prevY = by;
        prevZ = bz;
      }
    }
    return null;
  }
}

export { CHUNK_SIZE, CHUNK_HEIGHT, WATER_LEVEL };
