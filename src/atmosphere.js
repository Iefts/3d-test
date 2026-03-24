import * as THREE from 'three';

const DAY_LENGTH = 120; // seconds per full day cycle

export class Atmosphere {
  constructor(scene) {
    this.scene = scene;
    this.timeOfDay = 0.25; // Start at morning (0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset)

    // Sun light
    this.sun = new THREE.DirectionalLight(0xffffff, 1);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 200;
    this.sun.shadow.camera.left = -80;
    this.sun.shadow.camera.right = 80;
    this.sun.shadow.camera.top = 80;
    this.sun.shadow.camera.bottom = -80;
    this.sun.shadow.bias = -0.001;
    scene.add(this.sun);

    // Ambient light
    this.ambient = new THREE.AmbientLight(0x6688cc, 0.3);
    scene.add(this.ambient);

    // Hemisphere light
    this.hemi = new THREE.HemisphereLight(0x87ceeb, 0x445533, 0.2);
    scene.add(this.hemi);

    // Sky dome
    const skyGeo = new THREE.SphereGeometry(500, 32, 32);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x4488cc) },
        bottomColor: { value: new THREE.Color(0xaaccee) },
        horizonColor: { value: new THREE.Color(0xddeeff) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          vec3 color;
          if (h > 0.0) {
            color = mix(horizonColor, topColor, pow(h, 0.5));
          } else {
            color = mix(horizonColor, bottomColor, pow(-h, 0.5));
          }
          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(skyGeo, this.skyMat);
    this.sky.renderOrder = -1;
    scene.add(this.sky);

    // Fog
    this.fog = new THREE.FogExp2(0xaaccee, 0.008);
    scene.fog = this.fog;
  }

  update(delta, playerPos) {
    this.timeOfDay = (this.timeOfDay + delta / DAY_LENGTH) % 1;

    // Sun angle based on time
    const sunAngle = this.timeOfDay * Math.PI * 2 - Math.PI / 2;
    const sunHeight = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 100;
    const sunY = sunHeight * 100;

    this.sun.position.set(sunX + playerPos.x, sunY, 50 + playerPos.z);
    this.sun.target.position.copy(playerPos);
    this.scene.add(this.sun.target);

    // Day/night intensity
    const dayFactor = Math.max(0, Math.min(1, (sunHeight + 0.2) / 0.7));

    // Sun color and intensity
    const sunsetFactor = Math.max(0, 1 - Math.abs(sunHeight) * 3);
    const sunColor = new THREE.Color().lerpColors(
      new THREE.Color(0xff8844),  // sunset orange
      new THREE.Color(0xffeedd),  // daylight
      Math.min(1, dayFactor * 2)
    );
    this.sun.color.copy(sunColor);
    this.sun.intensity = dayFactor * 1.5;

    // Ambient
    this.ambient.intensity = 0.1 + dayFactor * 0.3;
    this.ambient.color.lerpColors(
      new THREE.Color(0x111133),  // night
      new THREE.Color(0x6688cc),  // day
      dayFactor
    );

    // Hemisphere
    this.hemi.intensity = 0.05 + dayFactor * 0.25;

    // Sky colors
    const nightTop = new THREE.Color(0x0a0a2a);
    const dayTop = new THREE.Color(0x4488cc);
    const nightHorizon = new THREE.Color(0x111122);
    const dayHorizon = new THREE.Color(0xaaccee);
    const sunsetHorizon = new THREE.Color(0xff7744);

    const topColor = new THREE.Color().lerpColors(nightTop, dayTop, dayFactor);
    let horizonColor = new THREE.Color().lerpColors(nightHorizon, dayHorizon, dayFactor);
    if (sunsetFactor > 0.1) {
      horizonColor.lerp(sunsetHorizon, sunsetFactor * 0.6);
    }

    this.skyMat.uniforms.topColor.value.copy(topColor);
    this.skyMat.uniforms.horizonColor.value.copy(horizonColor);
    this.skyMat.uniforms.bottomColor.value.lerpColors(
      new THREE.Color(0x080810),
      new THREE.Color(0x445533),
      dayFactor
    );

    // Fog color matches horizon
    this.fog.color.copy(horizonColor);
  }

  getTimeString() {
    const hours = Math.floor(this.timeOfDay * 24);
    const minutes = Math.floor((this.timeOfDay * 24 - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
}
