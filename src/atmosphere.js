import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Desaturate slightly
      float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      color.rgb = mix(color.rgb, vec3(lum), 0.15);
      // Split-tone: warm highlights, cool shadows
      vec3 warm = vec3(1.05, 0.98, 0.9);
      vec3 cool = vec3(0.9, 0.95, 1.05);
      color.rgb *= mix(cool, warm, lum);
      // Subtle vignette
      float dist = distance(vUv, vec2(0.5));
      color.rgb *= 1.0 - dist * 0.3;
      gl_FragColor = color;
    }
  `,
};

export function initAtmosphere(scene, renderer, camera) {
  // Fog
  scene.fog = new THREE.FogExp2(0x8a9bb2, 0.012);

  // Directional light (sun)
  const sun = new THREE.DirectionalLight(0xffe4b5, 1.5);
  sun.position.set(50, 80, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 200;
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Ambient light (cool)
  scene.add(new THREE.AmbientLight(0x6688aa, 0.4));

  // Hemisphere light
  scene.add(new THREE.HemisphereLight(0x87ceeb, 0x445533, 0.3));

  // Sky sphere
  const skyGeo = new THREE.SphereGeometry(500, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {},
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 horizon = vec3(0.769, 0.659, 0.510);  // warm
        vec3 zenith = vec3(0.357, 0.498, 0.647);   // desaturated blue
        vec3 color = mix(horizon, zenith, max(h, 0.0));
        // Below horizon: darker
        vec3 ground = vec3(0.3, 0.35, 0.3);
        color = mix(ground, color, smoothstep(-0.1, 0.0, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.renderOrder = -1;
  scene.add(sky);

  // Post-processing
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.3,  // strength
    0.4,  // radius
    0.85  // threshold
  );
  composer.addPass(bloom);

  const colorGrade = new ShaderPass(ColorGradeShader);
  composer.addPass(colorGrade);

  return composer;
}
