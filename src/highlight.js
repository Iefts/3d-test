import * as THREE from 'three';

export class BlockHighlight {
  constructor(scene) {
    const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
    const edges = new THREE.EdgesGeometry(geo);
    const mat = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 2,
      transparent: true,
      opacity: 0.5,
    });
    this.mesh = new THREE.LineSegments(edges, mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  update(hit) {
    if (hit) {
      this.mesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      this.mesh.visible = true;
    } else {
      this.mesh.visible = false;
    }
  }
}
