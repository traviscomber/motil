'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type * as THREEType from 'three';

const GLB_URL = '/motil-rock.glb';
// Keep the detailed brand artwork visible until a photorealistic 3D asset passes visual QA.
const HERO_3D_ENABLED = process.env.NEXT_PUBLIC_MOTIL_HERO_3D === 'enabled';

/**
 * The mineral's geometry and PBR materials come only from the supplied GLB.
 * The motion rig intentionally remains independent of mesh geometry.
 */
export default function LandingStone() {
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLSpanElement>(null);
  const [fallback, setFallback] = useState(!HERO_3D_ENABLED);

  useEffect(() => {
    if (!HERO_3D_ENABLED) return;
    const stage = stageRef.current;
    const mount = mountRef.current;
    if (!stage || !mount) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;

    async function init() {
      if (!stage || !mount) return;
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      if (cancelled) return;

      const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const compact = matchMedia('(max-width: 900px)').matches;
      const lowPower = compact || navigator.hardwareConcurrency <= 4;
      let renderer: THREEType.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'default' });
      } catch {
        setFallback(true);
        return;
      }
      if (cancelled) { renderer.dispose(); return; }

      renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.35 : 1.8));
      renderer.setClearColor(0x171715, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.74;
      renderer.domElement.setAttribute('aria-hidden', 'true');

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      const orbit = new THREE.Group();
      scene.add(orbit);

      scene.add(new THREE.HemisphereLight(0xb8a38d, 0x090807, 0.26));
      const key = new THREE.DirectionalLight(0xe8d3bb, 1.25);
      key.position.set(3, 5, 6);
      scene.add(key);
      const terracotta = new THREE.PointLight(0xb45b2a, 5.2, 9, 2);
      terracotta.position.set(-3, 0.8, 3);
      scene.add(terracotta);
      const edge = new THREE.DirectionalLight(0x70635f, 0.36);
      edge.position.set(-2.5, 1.5, -3);
      scene.add(edge);

      let model: THREEType.Group;
      try {
        const gltf = await new GLTFLoader().loadAsync(GLB_URL);
        if (cancelled) {
          renderer.dispose();
          return;
        }
        model = gltf.scene;
        // Reference target: black fractured basalt with sparse copper/amber veins.
        // Apply deterministic display-grade correction without modifying the source GLB.
        model.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          const source = Array.isArray(object.material) ? object.material : [object.material];
          const tuned = source.map((base) => {
            if (!(base instanceof THREE.MeshStandardMaterial)) return base;
            const material = base.clone();
            const name = material.name.toLowerCase();
            if (name.includes('basalt')) {
              material.color.setRGB(0.10, 0.078, 0.068);
              material.metalness = 0.25;
              material.roughness = 0.94;
              material.emissive.setRGB(0.006, 0.002, 0.001);
              material.emissiveIntensity = 0.18;
            } else if (name.includes('copper')) {
              material.color.setRGB(0.46, 0.24, 0.13);
              material.metalness = 0.78;
              material.roughness = 0.46;
              material.emissive.setRGB(0.13, 0.04, 0.012);
              material.emissiveIntensity = 0.28;
            } else if (name.includes('gold')) {
              material.color.setRGB(0.48, 0.35, 0.19);
              material.metalness = 0.88;
              material.roughness = 0.33;
              material.emissive.setRGB(0.095, 0.037, 0.009);
              material.emissiveIntensity = 0.24;
            } else if (name.includes('amber')) {
              material.color.setRGB(0.55, 0.29, 0.12);
              material.metalness = 0.38;
              material.roughness = 0.4;
              material.emissive.setRGB(0.76, 0.26, 0.055);
              material.emissiveIntensity = 0.65;
            } else if (name.includes('bornite')) {
              material.color.setRGB(0.23, 0.24, 0.39);
              material.metalness = 0.73;
              material.roughness = 0.47;
              material.emissive.setRGB(0.014, 0.012, 0.03);
              material.emissiveIntensity = 0.14;
            }
            // Protect dark minerals from blown highlights.
            material.needsUpdate = true;
            return material;
          });
          object.material = Array.isArray(object.material) ? tuned : tuned[0];
        });
      } catch {
        renderer.dispose();
        if (!cancelled) setFallback(true);
        return;
      }

      // Fit arbitrary authoring coordinates to the existing hero composition.
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const largest = Math.max(size.x, size.y, size.z);
      if (!Number.isFinite(largest) || largest <= 0) {
        renderer.dispose();
        setFallback(true);
        return;
      }
      model.position.sub(center);
      const normalizer = new THREE.Group();
      normalizer.scale.setScalar(2.45 / largest);
      normalizer.add(model);
      orbit.add(normalizer);

      camera.position.set(0, 0.05, 4.5);
      mount.appendChild(renderer.domElement);

      const resize = () => {
        const w = Math.max(1, mount.clientWidth);
        const h = Math.max(1, mount.clientHeight);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.render(scene, camera);
      };
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(mount);
      resize();

      let visible = true;
      let active = document.visibilityState === 'visible';
      let requestId = 0;
      let last = performance.now();
      let elapsed = 0;
      let pointerX = 0;
      let pointerY = 0;
      let rotationX = 0;
      let rotationY = 0;

      const draw = (now: number) => {
        requestId = 0;
        if (!visible || !active || reducedMotion) return;
        const delta = Math.min(0.05, (now - last) / 1000);
        last = now;
        elapsed += delta;
        const ease = 1 - Math.exp(-4.2 * delta);
        rotationX += (pointerY * -0.11 - rotationX) * ease;
        rotationY += (pointerX * 0.16 - rotationY) * ease;
        orbit.rotation.set(rotationX, rotationY + elapsed * 0.045, 0);
        orbit.position.y = Math.sin(elapsed * 0.8) * 0.035;
        renderer.render(scene, camera);
        requestId = requestAnimationFrame(draw);
      };
      const start = () => {
        if (requestId || !visible || !active || reducedMotion) return;
        last = performance.now();
        requestId = requestAnimationFrame(draw);
      };
      const onMove = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        pointerX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        pointerY = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      };
      const onLeave = () => { pointerX = 0; pointerY = 0; };
      const onVisibility = () => {
        active = document.visibilityState === 'visible';
        if (active) start();
        else { cancelAnimationFrame(requestId); requestId = 0; }
      };
      const observer = new IntersectionObserver(([entry]) => {
        visible = entry?.isIntersecting ?? true;
        if (visible) start();
        else { cancelAnimationFrame(requestId); requestId = 0; }
      }, { rootMargin: '100px' });
      observer.observe(stage);
      document.addEventListener('visibilitychange', onVisibility);
      stage.addEventListener('pointermove', onMove, { passive: true });
      stage.addEventListener('pointerleave', onLeave);
      start();
      cleanup = () => {
        cancelAnimationFrame(requestId);
        resizeObserver.disconnect();
        observer.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerleave', onLeave);
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => material.dispose());
          }
        });
        renderer.dispose();
        renderer.domElement.remove();
      };
      if (reducedMotion) renderer.render(scene, camera);
    }

    void init().catch(() => { if (!cancelled) setFallback(true); });
    return () => { cancelled = true; cleanup?.(); };
  }, []);

  return (
    <div ref={stageRef} role="img" aria-label="Roca mineral tridimensional de MOTIL" className="ld-stone-stage">
      <span ref={mountRef} className="ld-stone-tilt">
        {fallback ? <Image src="/brand/hero-stone.png" alt="" width={1024} height={1024} className="ld-stone" priority /> : null}
      </span>
    </div>
  );
}
