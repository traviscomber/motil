'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';

/* Real 3D hero stone (WebGL, like resend's cube): the authored MOTIL mineral
   model (public/brand/motil-stone-3d.glb). Its baked vertex colors map the
   mineral — bright warm facets are copper, dark facets are smoky quartz — so
   the canonical photographic look (the static hero-stone.png) is reproduced
   by driving roughness/metalness/emissive from the vertex-color luminance
   and lighting it with a strong warm key, like the original photo shoot.
   ACES tone mapping keeps the copper highlights photographic, not clipped.
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
      // ACES keeps the hot copper highlights photographic instead of clipped.
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;
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
        vertexColors: true, // the GLB bakes the mineral map: bright verts = copper, dark = quartz
        roughness: 0.55,
        metalness: 0.35,
      });
      // Photographic copper finish, driven by the baked vertex colors: bright
      // facets turn metallic with warm emissive lift (the photo's glowing
      // copper), dark facets stay rough smoky quartz. The GLB ships without
      // materials, so the canonical look is applied to every mesh.
      material.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
float copperLum = dot(vColor.rgb, vec3(0.299, 0.587, 0.114));
float copper = smoothstep(0.20, 0.58, copperLum);
/* Baked bright facets are cream — remap them to deep mineral copper and pull
   the quartz body down for the high-contrast look of the original photo. */
diffuseColor.rgb = mix(diffuseColor.rgb * vec3(0.62, 0.60, 0.58), diffuseColor.rgb * vec3(1.75, 0.78, 0.30), copper);`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.22, copper);'
          )
          .replace(
            '#include <metalnessmap_fragment>',
            '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.92, copper);'
          )
          .replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(0.55, 0.20, 0.05) * (copper * copper) * 0.45;'
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

      // Photo-study lighting: strong warm key from the front-top (the bright
      // copper highlights of the original shoot), copper rim from behind.
      scene.add(new THREE.HemisphereLight(0xf5ead6, 0x171715, 0.5));
      const key = new THREE.DirectionalLight(0xffe9cf, 2.6);
      key.position.set(2.5, 3.5, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xb95732, 1.4);
      rim.position.set(-4, -1, -3.5);
      scene.add(rim);
      const fill = new THREE.DirectionalLight(0xaaa69c, 0.45);
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
