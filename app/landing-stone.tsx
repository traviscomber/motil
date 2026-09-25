'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';

/* Real 3D hero stone (WebGL, like resend's cube): a crystalline recreation
   of the canonical MOTIL mineral — a flat-shaded displaced icosahedron whose
   facets are classified per crystal face into near-black smoky quartz and
   metallic copper (region field + per-facet id, stable under rotation), lit
   by a warm key, a copper rim and a tiny procedural PMREM studio environment
   so the metal facets catch real reflections.
   - Idle: continuous slow turntable rotation + subtle float.
   - Pointer: tilts the specimen toward the cursor (eased).
   - prefers-reduced-motion: renders a single static frame, no loop.
   If WebGL is unavailable, the canonical PNG specimen is used instead. */

const POINTER_TILT_RAD = 0.38;

/* ---- Deterministic 3D value noise (hand-rolled, no addons) ---- */

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
  for (let o = 0; o < octaves; o++) {
    sum += amp * valueNoise3(x * freq, y * freq, z * freq, seed + o * 7.13);
    norm += amp;
    amp *= 0.5;
    freq *= 2.1;
  }
  return sum / norm; // 0..1
}

/* Organic crystal silhouette: broad lumps + sharp creases (JS, per-vertex).
   Displaces an icosahedron that is rendered flat-shaded, so the shell breaks
   into planar crystal facets instead of reading as a smooth sphere. */
function rockRadius(dx: number, dy: number, dz: number) {
  const lumps = fbm3(dx * 1.5 + 5, dy * 1.5 + 5, dz * 1.5 + 5, 1);
  const detail = fbm3(dx * 4 + 9, dy * 4 + 9, dz * 4 + 9, 2, 3);
  const crease = 1 - Math.abs(2 * fbm3(dx * 2.6 + 2, dy * 2.6 + 2, dz * 2.6 + 2, 3, 3) - 1);
  const sharp = fbm3(dx * 8 + 14, dy * 8 + 14, dz * 8 + 14, 4, 2);
  return 0.92 * (0.74 + lumps * 0.30 + detail * 0.10 + crease * 0.20 + sharp * 0.07);
}

/* Mineral tones run per-pixel in the fragment shader (STONE_GLSL). */
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
    p *= 2.1;
    a *= 0.5;
  }
  return s / 0.9375; // normalize to ~0..1
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

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setFallback(true);
        return;
      }
      if (disposed) {
        renderer.dispose();
        return;
      }

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      // Square mount (CSS aspect-ratio: 1/1 in landing.css) — keep both in sync.
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      camera.position.set(0, 0.1, 5.1);

      // Crystalline shell: displaced icosahedron rendered flat-shaded, so the
      // surface breaks into planar crystal facets. Facet-classified copper is
      // keyed on the flat (per-face) normal, which is constant over each
      // facet — that's what makes the ore read as crystal faces, not paint.
      const geometry = new THREE.IcosahedronGeometry(1, 24);
      const position = geometry.getAttribute('position');
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        v.fromBufferAttribute(position, i).normalize();
        const r = rockRadius(v.x, v.y, v.z);
        position.setXYZ(i, v.x * r, v.y * r * 0.94, v.z * r);
      }
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.2,
        flatShading: true,
      });
      /* Facet-level ore classification, evaluated per crystal face:
           - each facet gets a stable id from its flat normal;
           - a low-frequency ore field decides whether the REGION is copper;
           - inside copper regions the brightest facets (by facing) glow.
         Quartz facets stay rough and near-black; copper facets are metallic
         with a warm ember emissive, lit hard by the warm key light. */
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vStoneDir;\nvarying vec3 vObjPos;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStoneDir = normalize(position);\nvObjPos = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\nvarying vec3 vStoneDir;\nvarying vec3 vObjPos;\n${STONE_GLSL}`)
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
/* Per-crystal-face normal from screen-space derivatives of the OBJECT-space
   position: constant across each flat facet and stable as the specimen
   rotates (a view-space derivative normal would make the ore swim). */
vec3 fdxO = dFdx(vObjPos);
vec3 fdyO = dFdy(vObjPos);
vec3 facetN = normalize(cross(fdxO, fdyO));
float facetId = stoneHash(floor(facetN * 7.0 + 3.5));
float oreRegion = stoneFbm(vStoneDir * 2.2 + 20.0);
float copperRegion = smoothstep(0.50, 0.62, oreRegion + facetId * 0.06);
vec3 fdxV = dFdx(-vViewPosition);
vec3 fdyV = dFdy(-vViewPosition);
vec3 facetNv = normalize(cross(fdxV, fdyV));
float facetFace = clamp(dot(facetNv, normalize(vec3(0.35, 0.55, 0.75))), 0.0, 1.0);
/* Region dominates (clustered ore patches, not confetti); within a copper
   region the light-facing facets shine brightest, the rest stay matte. */
float copperFacet = copperRegion * (0.45 + 0.55 * smoothstep(0.25, 0.9, facetFace + facetId * 0.25));
vec3 quartz = mix(vec3(0.024, 0.022, 0.021), vec3(0.070, 0.066, 0.061), stoneFbm(vStoneDir * 3.0 + 60.0));
diffuseColor.rgb *= mix(quartz, vec3(0.72, 0.33, 0.13), copperFacet);`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.16, copperFacet);'
          )
          .replace(
            '#include <metalnessmap_fragment>',
            '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.95, copperFacet);'
          )
          .replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.55, 0.22, 0.07) * (copperFacet * copperFacet) * 0.30;'
          );
      };
      const rock = new THREE.Mesh(geometry, material);

      const tiltGroup = new THREE.Group();
      tiltGroup.add(rock);
      tiltGroup.rotation.x = 0.12;
      rock.rotation.y = 0.9; // start on a vein-rich face
      scene.add(tiltGroup);

      // Warm key from the front-top, copper rim from behind, faint fill.
      scene.add(new THREE.HemisphereLight(0xe8e3d6, 0x171715, 0.35));
      const key = new THREE.DirectionalLight(0xe8e3d6, 1.4);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xb95732, 1.1);
      rim.position.set(-4, -1, -3.5);
      scene.add(rim);
      const fill = new THREE.DirectionalLight(0xaaa69c, 0.3);
      fill.position.set(-2.5, 1.5, 4);
      scene.add(fill);

      /* Studio environment for the metallic facets: a tiny hand-built room
         (dark graphite walls, one warm overhead softbox, one copper card)
         prefiltered with PMREM — core three, no examples addons. Without it,
         metalness-0.95 facets go black outside the direct light hits. */
      const envScene = new THREE.Scene();
      const envRoom = new THREE.Mesh(
        new THREE.BoxGeometry(12, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0x171715, side: THREE.BackSide })
      );
      envScene.add(envRoom);
      const softbox = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 3),
        new THREE.MeshBasicMaterial({ color: 0xfff0dd })
      );
      softbox.position.set(1.5, 5.9, 2.5);
      softbox.rotation.x = Math.PI / 2;
      envScene.add(softbox);
      const copperCard = new THREE.Mesh(
        new THREE.PlaneGeometry(4, 2.4),
        new THREE.MeshBasicMaterial({ color: 0xb95732 })
      );
      copperCard.position.set(-5.9, 1.2, -2.5);
      copperCard.rotation.y = Math.PI / 2;
      envScene.add(copperCard);
      const coolCard = new THREE.Mesh(
        new THREE.PlaneGeometry(3, 2),
        new THREE.MeshBasicMaterial({ color: 0x393833 })
      );
      coolCard.position.set(5.9, -1, 3);
      coolCard.rotation.y = -Math.PI / 2;
      envScene.add(coolCard);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(envScene, 0.05);
      scene.environment = envRT.texture;
      scene.environmentIntensity = 0.55;
      pmrem.dispose();
      envRoom.geometry.dispose();
      (envRoom.material as THREE.Material).dispose();
      softbox.geometry.dispose();
      (softbox.material as THREE.Material).dispose();
      copperCard.geometry.dispose();
      (copperCard.material as THREE.Material).dispose();
      coolCard.geometry.dispose();
      (coolCard.material as THREE.Material).dispose();

      const resize = () => {
        const size = mount.clientWidth || 440;
        renderer.setSize(size, size, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        if (reduceMotion) renderer.render(scene, camera); // single static frame
      };
      resize();
      const observer = new ResizeObserver(resize);
      observer.observe(mount);

      let raf = 0;
      let last = performance.now();
      let elapsed = 0;
      let autoRot = 0;
      let targetTiltX = 0.12;
      let targetTiltY = 0;
      let tiltX = 0.12;
      let tiltY = 0;

      const frame = (now: number) => {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += dt;

        if (!reduceMotion) {
          autoRot += dt * 0.16; // slow resend-style turntable
          rock.position.y = Math.sin(elapsed * 0.8) * 0.06;
          const k = 1 - Math.pow(1 - 0.08, dt * 60);
          tiltX += (targetTiltX - tiltX) * k;
          tiltY += (targetTiltY - tiltY) * k;
          tiltGroup.rotation.x = tiltX;
          tiltGroup.rotation.y = tiltY;
        }
        rock.rotation.y = 0.9 + autoRot;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };

      const onMove = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        targetTiltY = nx * POINTER_TILT_RAD;
        targetTiltX = 0.12 - ny * POINTER_TILT_RAD;
      };
      const onLeave = () => {
        targetTiltX = 0.12;
        targetTiltY = 0;
      };

      if (!reduceMotion) {
        stage.addEventListener('pointermove', onMove);
        stage.addEventListener('pointerleave', onLeave);
        raf = requestAnimationFrame(frame);
      }
      // Reduced motion: a single static frame is rendered (in resize/setup);
      // no animation loop, no listeners.

      cleanup = () => {
        cancelAnimationFrame(raf);
        observer.disconnect();
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
      aria-label="Mineral de cuarzo oscuro con vetas de cobre"
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
          />
        ) : null}
      </span>
    </div>
  );
}
