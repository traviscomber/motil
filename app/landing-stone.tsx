'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';

/*
 * MOTIL mineral hero
 * ------------------
 * Real-time WebGL specimen with a deliberately bounded geometry budget.
 * Perceived fidelity comes from procedural surface breakup, PBR response,
 * copper-sulfide veining, ACES tone mapping and studio lighting rather than
 * brute-force subdivision.
 *
 * Desktop: ~20k triangles, DPR <= 2.
 * Mobile / lower-power devices: ~5k triangles, DPR <= 1.5.
 * Motion pauses offscreen and respects prefers-reduced-motion.
 * The canonical PNG remains the no-WebGL fallback.
 */

const POINTER_TILT_RAD = 0.28;

function hash3(ix: number, iy: number, iz: number, seed: number) {
  const s = Math.sin(ix * 127.1 + iy * 311.7 + iz * 74.7 + seed * 269.5) * 43758.5453;
  return s - Math.floor(s);
}

const fade = (t: number) => t * t * (3 - 2 * t);

function valueNoise3(x: number, y: number, z: number, seed: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const fx = fade(x - ix);
  const fy = fade(y - iy);
  const fz = fade(z - iz);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

  const c000 = hash3(ix, iy, iz, seed);
  const c100 = hash3(ix + 1, iy, iz, seed);
  const c010 = hash3(ix, iy + 1, iz, seed);
  const c110 = hash3(ix + 1, iy + 1, iz, seed);
  const c001 = hash3(ix, iy, iz + 1, seed);
  const c101 = hash3(ix + 1, iy, iz + 1, seed);
  const c011 = hash3(ix, iy + 1, iz + 1, seed);
  const c111 = hash3(ix + 1, iy + 1, iz + 1, seed);

  return lerp(
    lerp(lerp(c000, c100, fx), lerp(c010, c110, fx), fy),
    lerp(lerp(c001, c101, fx), lerp(c011, c111, fx), fy),
    fz
  );
}

function fbm3(x: number, y: number, z: number, seed: number, octaves = 4) {
  let amp = 0.5;
  let freq = 1;
  let sum = 0;
  let norm = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    sum += amp * valueNoise3(x * freq, y * freq, z * freq, seed + octave * 7.13);
    norm += amp;
    amp *= 0.5;
    freq *= 2.08;
  }

  return sum / norm;
}

function rockRadius(dx: number, dy: number, dz: number) {
  const macro = fbm3(dx * 1.35 + 4, dy * 1.35 + 4, dz * 1.35 + 4, 1);
  const shelves = fbm3(dx * 2.7 + 8, dy * 2.7 + 8, dz * 2.7 + 8, 2, 3);
  const chips = fbm3(dx * 6.5 + 15, dy * 6.5 + 15, dz * 6.5 + 15, 3, 2);
  const fracture = 1 - Math.abs(2 * fbm3(dx * 3.4 + 2, dy * 3.4 + 2, dz * 3.4 + 2, 4, 3) - 1);

  return 0.94 * (0.74 + macro * 0.29 + shelves * 0.12 + chips * 0.055 + fracture * 0.12);
}

const STONE_GLSL = /* glsl */ `
float stoneHash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float stoneNoise(vec3 x) {
  vec3 i = floor(x);
  vec3 f = fract(x);
  f = f * f * (3.0 - 2.0 * f);

  return mix(
    mix(
      mix(stoneHash(i + vec3(0.0, 0.0, 0.0)), stoneHash(i + vec3(1.0, 0.0, 0.0)), f.x),
      mix(stoneHash(i + vec3(0.0, 1.0, 0.0)), stoneHash(i + vec3(1.0, 1.0, 0.0)), f.x),
      f.y
    ),
    mix(
      mix(stoneHash(i + vec3(0.0, 0.0, 1.0)), stoneHash(i + vec3(1.0, 0.0, 1.0)), f.x),
      mix(stoneHash(i + vec3(0.0, 1.0, 1.0)), stoneHash(i + vec3(1.0, 1.0, 1.0)), f.x),
      f.y
    ),
    f.z
  );
}

float stoneFbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;

  for (int o = 0; o < 4; o++) {
    s += a * stoneNoise(p);
    p *= 2.08;
    a *= 0.5;
  }

  return s / 0.9375;
}
`;

export default function LandingStone() {
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLSpanElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    const mount = mountRef.current;
    if (!stage || !mount) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    const init = async () => {
      const THREE = await import('three');
      if (disposed) return;

      const compactViewport = window.matchMedia('(max-width: 900px)').matches;
      const lowPower = compactViewport || navigator.hardwareConcurrency <= 4;
      const geometryDetail = lowPower ? 4 : 5;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          premultipliedAlpha: true,
        });
      } catch {
        setFallback(true);
        return;
      }

      if (disposed) {
        renderer.dispose();
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, lowPower ? 1.5 : 2));
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = lowPower ? 1.08 : 1.16;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
      camera.position.set(0.05, 0.08, 5.25);

      /*
       * Keep geometry bounded. Detail 5 is ~20k faces instead of an explosive
       * detail-24 subdivision; surface richness is procedural in the shader.
       */
      const geometry = new THREE.IcosahedronGeometry(1, geometryDetail);
      const position = geometry.getAttribute('position');
      const vertex = new THREE.Vector3();

      for (let index = 0; index < position.count; index += 1) {
        vertex.fromBufferAttribute(position, index).normalize();
        const radius = rockRadius(vertex.x, vertex.y, vertex.z);
        const x = vertex.x * radius * (1 + vertex.y * 0.035);
        const y = vertex.y * radius * 0.94;
        const z = vertex.z * radius * 0.985;
        position.setXYZ(index, x, y, z);
      }

      geometry.computeVertexNormals();

      const material = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: 0.76,
        metalness: 0.12,
        flatShading: true,
        clearcoat: 0.12,
        clearcoatRoughness: 0.55,
        sheen: 0.08,
        sheenColor: new THREE.Color(0x6f3928),
      });
      material.envMapIntensity = lowPower ? 0.72 : 0.94;
      material.customProgramCacheKey = () => 'motil-mineral-sulfide-v3';

      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            '#include <common>\nvarying vec3 vStoneDir;\nvarying vec3 vObjPos;'
          )
          .replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\nvStoneDir = normalize(position);\nvObjPos = position;'
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
varying vec3 vStoneDir;
varying vec3 vObjPos;
${STONE_GLSL}`
          )
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>

/* Stable object-space crystal face. */
vec3 fdxO = dFdx(vObjPos);
vec3 fdyO = dFdy(vObjPos);
vec3 facetN = normalize(cross(fdxO, fdyO));
float facetId = stoneHash(floor(facetN * 9.0 + 4.5));

/* Broad sulfide bodies plus thin mineral fissures. */
float oreField = stoneFbm(vStoneDir * 2.15 + vec3(19.0, 7.0, 13.0));
float clusterField = stoneFbm(vStoneDir * 1.35 + vec3(3.0, 17.0, 5.0));
float broadOre = smoothstep(0.52, 0.68, oreField + clusterField * 0.14 + facetId * 0.035);

float fissureField = stoneFbm(vStoneDir * 5.9 + vec3(41.0, 11.0, 27.0));
float fissure = 1.0 - smoothstep(0.018, 0.11, abs(fissureField - 0.50));
float fissureCluster = smoothstep(0.38, 0.66, clusterField);
float copperVein = fissure * fissureCluster;

vec3 fdxV = dFdx(-vViewPosition);
vec3 fdyV = dFdy(-vViewPosition);
vec3 facetNv = normalize(cross(fdxV, fdyV));
float faceLight = clamp(dot(facetNv, normalize(vec3(0.38, 0.54, 0.75))), 0.0, 1.0);

float copperSurface = clamp(broadOre * 0.70 + copperVein * 1.15, 0.0, 1.0);
float hotVein = pow(clamp(copperVein * (0.48 + faceLight * 0.75), 0.0, 1.0), 1.7);

float graphiteNoise = stoneFbm(vStoneDir * 3.8 + vec3(61.0, 31.0, 43.0));
vec3 graphite = mix(
  vec3(0.018, 0.017, 0.016),
  vec3(0.090, 0.080, 0.070),
  graphiteNoise
);

vec3 oxidizedCopper = vec3(0.30, 0.105, 0.040);
vec3 polishedCopper = vec3(0.88, 0.39, 0.115);
vec3 copper = mix(oxidizedCopper, polishedCopper, clamp(faceLight * 0.78 + facetId * 0.35, 0.0, 1.0));

/* Copper exists in bodies and veins, but the brightest energy stays inside
   the fissures so the object reads as ore rather than lava. */
diffuseColor.rgb *= mix(graphite, copper, copperSurface);
`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
roughnessFactor = mix(0.82, 0.19, copperSurface);
roughnessFactor = mix(roughnessFactor, 0.11, hotVein * 0.55);
`
          )
          .replace(
            '#include <metalnessmap_fragment>',
            `#include <metalnessmap_fragment>
metalnessFactor = mix(0.08, 0.94, copperSurface);
`
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(1.15, 0.31, 0.055) * hotVein * 1.10;
totalEmissiveRadiance += vec3(0.32, 0.075, 0.018) * broadOre * faceLight * 0.16;
`
          );
      };

      const rock = new THREE.Mesh(geometry, material);
      rock.rotation.set(-0.08, 0.88, 0.05);

      const tiltGroup = new THREE.Group();
      tiltGroup.add(rock);
      tiltGroup.rotation.x = 0.10;
      scene.add(tiltGroup);

      /* Quiet studio rig: bone key, copper rim, neutral fill. */
      scene.add(new THREE.HemisphereLight(0xe8e3d6, 0x111110, 0.34));

      const key = new THREE.DirectionalLight(0xffead5, lowPower ? 1.65 : 2.0);
      key.position.set(3.8, 4.6, 5.2);
      scene.add(key);

      const rim = new THREE.DirectionalLight(0xd76532, lowPower ? 1.15 : 1.55);
      rim.position.set(-4.6, 0.5, -3.8);
      scene.add(rim);

      const fill = new THREE.DirectionalLight(0x8f8a80, 0.42);
      fill.position.set(-2.4, 2.2, 4.6);
      scene.add(fill);

      const copperKick = new THREE.PointLight(0xff7a28, lowPower ? 1.0 : 1.6, 6, 2);
      copperKick.position.set(2.2, -1.3, 2.7);
      scene.add(copperKick);

      /*
       * Tiny procedural studio environment. Metallic faces need something to
       * reflect; otherwise a physically correct copper surface reads black.
       */
      const envScene = new THREE.Scene();
      const envRoom = new THREE.Mesh(
        new THREE.BoxGeometry(12, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x141413, side: THREE.BackSide })
      );
      envScene.add(envRoom);

      const softbox = new THREE.Mesh(
        new THREE.PlaneGeometry(5.2, 3.1),
        new THREE.MeshBasicMaterial({ color: 0xffead5 })
      );
      softbox.position.set(1.5, 5.9, 2.7);
      softbox.rotation.x = Math.PI / 2;
      envScene.add(softbox);

      const copperCard = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 2.6),
        new THREE.MeshBasicMaterial({ color: 0xb95732 })
      );
      copperCard.position.set(-5.9, 1.0, -2.7);
      copperCard.rotation.y = Math.PI / 2;
      envScene.add(copperCard);

      const neutralCard = new THREE.Mesh(
        new THREE.PlaneGeometry(3.4, 2.2),
        new THREE.MeshBasicMaterial({ color: 0x4b4842 })
      );
      neutralCard.position.set(5.9, -0.6, 3.0);
      neutralCard.rotation.y = -Math.PI / 2;
      envScene.add(neutralCard);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(envScene, 0.08);
      scene.environment = envRT.texture;

      pmrem.dispose();
      envRoom.geometry.dispose();
      (envRoom.material as THREE.Material).dispose();
      softbox.geometry.dispose();
      (softbox.material as THREE.Material).dispose();
      copperCard.geometry.dispose();
      (copperCard.material as THREE.Material).dispose();
      neutralCard.geometry.dispose();
      (neutralCard.material as THREE.Material).dispose();

      const resize = () => {
        const size = mount.clientWidth || 520;
        renderer.setSize(size, size, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.render(scene, camera);
      };

      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);

      let raf = 0;
      let running = false;
      let visible = true;
      let pageVisible = document.visibilityState !== 'hidden';
      let last = performance.now();
      let elapsed = 0;
      let autoRotation = 0;
      let targetTiltX = 0.10;
      let targetTiltY = 0;
      let tiltX = 0.10;
      let tiltY = 0;

      const frame = (now: number) => {
        if (!visible || !pageVisible || reduceMotion) {
          running = false;
          return;
        }

        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += dt;
        autoRotation += dt * 0.105;

        rock.position.y = Math.sin(elapsed * 0.72) * 0.045;
        rock.rotation.y = 0.88 + autoRotation;

        const ease = 1 - Math.pow(1 - 0.075, dt * 60);
        tiltX += (targetTiltX - tiltX) * ease;
        tiltY += (targetTiltY - tiltY) * ease;
        tiltGroup.rotation.x = tiltX;
        tiltGroup.rotation.y = tiltY;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };

      const startLoop = () => {
        if (reduceMotion || running || !visible || !pageVisible) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      };

      const onMove = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        targetTiltY = nx * POINTER_TILT_RAD;
        targetTiltX = 0.10 - ny * POINTER_TILT_RAD;
      };

      const onLeave = () => {
        targetTiltX = 0.10;
        targetTiltY = 0;
      };

      const intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          visible = entry?.isIntersecting ?? true;
          if (visible) startLoop();
        },
        { rootMargin: '120px' }
      );
      intersectionObserver.observe(stage);

      const onVisibilityChange = () => {
        pageVisible = document.visibilityState !== 'hidden';
        if (pageVisible) startLoop();
      };
      document.addEventListener('visibilitychange', onVisibilityChange);

      if (!reduceMotion) {
        stage.addEventListener('pointermove', onMove, { passive: true });
        stage.addEventListener('pointerleave', onLeave, { passive: true });
        startLoop();
      }

      cleanup = () => {
        running = false;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        document.removeEventListener('visibilitychange', onVisibilityChange);
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerleave', onLeave);
        geometry.dispose();
        material.dispose();
        envRT.texture.dispose();
        envRT.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    };

    init().catch(() => setFallback(true));

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <div
      ref={stageRef}
      role="img"
      aria-label="Mineral oscuro de sulfuros de cobre con vetas metálicas"
      className="ld-stone-stage"
    >
      <span ref={mountRef} className="ld-stone-tilt">
        {fallback ? (
          <Image
            src="/brand/hero-stone.png"
            alt=""
            width={1024}
            height={1024}
            className="ld-stone"
            priority
          />
        ) : null}
      </span>
    </div>
  );
}
