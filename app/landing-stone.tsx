'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';

/* Real 3D hero stone (WebGL, like resend's cube): the authored MOTIL mineral
   model (public/brand/motil-stone-3d.glb) shaded with the canonical MOTIL
   mineral look — near-black smoky-quartz body with crisp metallic copper
   veins, per-pixel in the fragment shader — lit warm from the front and
   copper from behind, on the canonical dark palette.
   - Idle: continuous slow turntable rotation + subtle float.
   - Pointer: tilts the specimen toward the cursor (eased).
   - prefers-reduced-motion: renders a single static frame, no loop.
   If WebGL is unavailable or the model fails to load, the canonical PNG
   specimen is used instead. */

const POINTER_TILT_RAD = 0.38;
const STONE_GLB_URL = '/brand/motil-stone-3d.glb';
/* Bounding-sphere radius the authored model is normalized to (camera sits at
   z = 5.1 with fov 30 — keep both in sync with any framing change). */
const STONE_RADIUS = 1.55;

/* Copper veins + mineral tones run per-pixel in the fragment shader
   (STONE_GLSL) so the vein lines stay razor-thin at any resolution. */
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
float stoneVein(vec3 d) {
  float t1 = stoneFbm(d * 3.1 + 20.0);
  float main = pow(max(0.0, 1.0 - abs(t1 - 0.5) * 2.0 / 0.14), 3.0);
  float t2 = stoneFbm(d * 5.3 + 40.0);
  float sec = pow(max(0.0, 1.0 - abs(t2 - 0.5) * 2.0 / 0.09), 3.0) * 0.5;
  float region = smoothstep(0.42, 0.72, stoneFbm(d * 1.2 + 80.0));
  return min(1.0, max(main, sec) * region);
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

      // Authored mineral model, normalized to a known bounding-sphere radius
      // and re-centered so it orbits the view axis regardless of source scale.
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        new GLTFLoader().load(STONE_GLB_URL, resolve, undefined, reject);
      });
      if (disposed) {
        renderer.dispose();
        renderer.domElement.remove();
        return;
      }
      const specimen = gltf.scene;
      {
        const bounds = new THREE.Box3().setFromObject(specimen);
        const sphere = bounds.getBoundingSphere(new THREE.Sphere());
        const scale = STONE_RADIUS / (sphere.radius || 1);
        specimen.scale.setScalar(scale);
        specimen.position.sub(sphere.center.clone().multiplyScalar(scale));
      }

      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.7,
        metalness: 0.2,
      });
      // Per-pixel mineral body + copper veins; veins metallic and slightly
      // emissive, body stays rough near-black quartz. The authored GLB ships
      // without materials, so the canonical look is applied to every mesh.
      material.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vStoneDir;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvStoneDir = normalize(position);');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', `#include <common>\nvarying vec3 vStoneDir;\n${STONE_GLSL}`)
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
float vein = stoneVein(vStoneDir);
vec3 stoneBody = mix(vec3(0.035, 0.033, 0.03), vec3(0.095, 0.09, 0.082), stoneFbm(vStoneDir * 3.0 + 60.0));
diffuseColor.rgb *= mix(stoneBody, vec3(0.85, 0.42, 0.2), pow(vein, 0.75));`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.2, vein);'
          )
          .replace(
            '#include <metalnessmap_fragment>',
            '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.95, vein);'
          )
          .replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.5, 0.2, 0.08) * (vein * vein) * 0.35;'
          );
      };
      specimen.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) {
          node.castShadow = false;
          (node as THREE.Mesh).material = material;
        }
      });

      const tiltGroup = new THREE.Group();
      tiltGroup.add(specimen);
      tiltGroup.rotation.x = 0.12;
      specimen.rotation.y = 0.9; // start on a vein-rich face
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
          autoRot += dt * 0.45; // resend-style turntable
          specimen.position.y = Math.sin(elapsed * 0.8) * 0.06;
          const k = 1 - Math.pow(1 - 0.08, dt * 60);
          tiltX += (targetTiltX - tiltX) * k;
          tiltY += (targetTiltY - tiltY) * k;
          tiltGroup.rotation.x = tiltX;
          tiltGroup.rotation.y = tiltY;
        }
        specimen.rotation.y = 0.9 + autoRot;

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
        specimen.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) (node as THREE.Mesh).geometry.dispose();
        });
        material.dispose();
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
