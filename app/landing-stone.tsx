'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';

/* Real 3D hero stone (WebGL, like resend's cube): a displaced-icosahedron
   mineral with copper edge veins, lit warm from the front and copper from
   behind, on the canonical dark palette.
   - Idle: continuous slow turntable rotation + subtle float.
   - Pointer: tilts the specimen toward the cursor (eased).
   - prefers-reduced-motion: renders a static mineral, no ambient motion.
   If WebGL is unavailable, the canonical PNG specimen is used instead. */

const POINTER_TILT_RAD = 0.38;

/* Deterministic crystal displacement: duplicated vertices of the non-indexed
   icosahedron share positions, so hashing positions keeps faces connected. */
function crystalField(x: number, y: number, z: number) {
  const h = (seed: number) => {
    const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 5.133) * 43758.5453;
    return s - Math.floor(s);
  };
  const stepped = Math.round(h(1) * 3) / 3; // chunky facets
  return 1 + stepped * 0.32 + (h(2) - 0.5) * 0.07;
}

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

      // Mineral body: displaced icosahedron, flat-shaded, per-facet dark tones.
      const geometry = new THREE.IcosahedronGeometry(1.3, 1).toNonIndexed();
      const position = geometry.getAttribute('position');
      const colors = new Float32Array(position.count * 3);
      const base = new THREE.Color(0x2b2a26); // canonical tertiary family
      const dark = new THREE.Color(0x1d1c19);
      const v = new THREE.Vector3();
      for (let i = 0; i < position.count; i += 3) {
        const tone = dark.clone().lerp(base, 0.35 + 0.65 * ((i / 3) % 7) / 7);
        for (let j = 0; j < 3; j++) {
          const idx = i + j;
          v.fromBufferAttribute(position, idx).normalize();
          const r = crystalField(v.x, v.y, v.z);
          position.setXYZ(idx, v.x * r, v.y * r, v.z * r);
          colors[idx * 3] = tone.r;
          colors[idx * 3 + 1] = tone.g;
          colors[idx * 3 + 2] = tone.b;
        }
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      // flatShading derives face normals in the shader; no normal pass needed.

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.52,
        metalness: 0.42,
        flatShading: true,
      });
      const rock = new THREE.Mesh(geometry, material);

      // Copper veins along the crystal edges (canonical detail accent).
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 18),
        new THREE.LineBasicMaterial({ color: 0xb95732, transparent: true, opacity: 0.85 })
      );
      rock.add(edges);

      const tiltGroup = new THREE.Group();
      tiltGroup.add(rock);
      tiltGroup.rotation.x = 0.12;
      scene.add(tiltGroup);

      // Warm key from the front-top, copper rim from behind, faint fill.
      scene.add(new THREE.HemisphereLight(0xe8e3d6, 0x171715, 0.45));
      const key = new THREE.DirectionalLight(0xe8e3d6, 1.7);
      key.position.set(3, 4, 5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xb95732, 1.1);
      rim.position.set(-4, -1, -3.5);
      scene.add(rim);
      const fill = new THREE.DirectionalLight(0xaaa69c, 0.35);
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
          rock.position.y = Math.sin(elapsed * 0.8) * 0.06;
          const k = 1 - Math.pow(1 - 0.08, dt * 60);
          tiltX += (targetTiltX - tiltX) * k;
          tiltY += (targetTiltY - tiltY) * k;
          tiltGroup.rotation.x = tiltX;
          tiltGroup.rotation.y = tiltY;
        }
        rock.rotation.y = autoRot;

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
        edges.geometry.dispose();
        (edges.material as THREE.Material).dispose();
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
