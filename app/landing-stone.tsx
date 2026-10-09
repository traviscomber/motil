'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type * as THREEType from 'three';

const GLB_URL = '/motil-rock-master-v1.glb';
// Keep the detailed brand artwork visible until a photorealistic 3D asset passes visual QA.
const HERO_3D_ENABLED = process.env.NEXT_PUBLIC_MOTIL_HERO_3D === 'enabled';

/**
 * The mineral's geometry and PBR materials come only from the supplied GLB.
 * The motion rig intentionally remains independent of mesh geometry.
 */
interface LandingStoneProps { force3D?: boolean; initialYaw?: number }

export default function LandingStone({ force3D = false, initialYaw = 0 }: LandingStoneProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLSpanElement>(null);
  const enabled = HERO_3D_ENABLED || force3D;
  // Keep the approved still visible until the first 3D frame has rendered.
  const [fallback, setFallback] = useState(true);

  useEffect(() => {
    if (!enabled) return;
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
      renderer.toneMappingExposure = 0.99;
      renderer.domElement.setAttribute('aria-hidden', 'true');

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      const orbit = new THREE.Group();
      scene.add(orbit);

      // Neutral studio lights reveal the GLB's authored vertex colors; no hue painting in JS.
      scene.add(new THREE.HemisphereLight(0xd8d3cb, 0x181615, 0.62));
      const key = new THREE.DirectionalLight(0xf4ebdf, 2.05);
      key.position.set(3, 4.5, 5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xc7cbd0, 0.82);
      fill.position.set(-4, -0.5, 3);
      scene.add(fill);
      const rim = new THREE.DirectionalLight(0xe0d2c4, 1.25);
      rim.position.set(-1.5, 2.5, -4);
      scene.add(rim);

      let model: THREEType.Group;
      try {
        const gltf = await new GLTFLoader().loadAsync(GLB_URL);
        if (cancelled) {
          renderer.dispose();
          return;
        }
        model = gltf.scene;
        // Asset-first: glTF owns its geometry, vertex colors and PBR materials.
        // Recoloring individual meshes here would invalidate the 360-degree master.
      } catch {
        renderer.dispose();
        if (!cancelled) setFallback(true);
        return;
      }

      // Fit arbitrary authoring coordinates to the existing hero composition.
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const sphere = bounds.getBoundingSphere(new THREE.Sphere());
      if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) {
        renderer.dispose();
        setFallback(true);
        return;
      }
      model.position.sub(center);
      const normalizer = new THREE.Group();
      // Bound by the enclosing sphere, so quarter-turns never crop the silhouette.
      normalizer.scale.setScalar(1.16 / sphere.radius);
      normalizer.add(model);
      orbit.add(normalizer);
      orbit.rotation.y = (initialYaw * Math.PI) / 180;

      camera.position.set(0, 0.05, 4.8);
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
        if (!cancelled) setFallback(false);
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
      let dragYaw = 0;
      let dragPitch = 0;
      let draggingId: number | null = null;
      let dragX = 0;
      let dragY = 0;
      const initialYawRad = (initialYaw * Math.PI) / 180;

      const draw = (now: number) => {
        requestId = 0;
        if (!visible || !active || reducedMotion) return;
        const delta = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (draggingId === null) elapsed += delta;
        const ease = 1 - Math.exp(-4.2 * delta);
        rotationX += (pointerY * -0.11 - rotationX) * ease;
        rotationY += (pointerX * 0.16 - rotationY) * ease;
        orbit.rotation.set(rotationX + dragPitch, initialYawRad + rotationY + dragYaw + elapsed * 0.045, 0);
        orbit.position.y = Math.sin(elapsed * 0.8) * 0.035;
        renderer.render(scene, camera);
        requestId = requestAnimationFrame(draw);
      };
      const start = () => {
        if (requestId || !visible || !active || reducedMotion) return;
        last = performance.now();
        requestId = requestAnimationFrame(draw);
      };
      const onDown = (event: PointerEvent) => {
        if (event.button !== 0 || !event.isPrimary) return;
        draggingId = event.pointerId;
        dragX = event.clientX;
        dragY = event.clientY;
        stage.setPointerCapture(event.pointerId);
      };
      const onMove = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        if (draggingId === event.pointerId) {
          // One stage-width of movement corresponds to a complete 360-degree turn.
          dragYaw += ((event.clientX - dragX) / Math.max(1, rect.width)) * Math.PI * 2;
          dragPitch = Math.max(-0.35, Math.min(0.35,
            dragPitch + ((event.clientY - dragY) / Math.max(1, rect.height)) * 0.9));
          dragX = event.clientX;
          dragY = event.clientY;
          if (reducedMotion) {
            orbit.rotation.set(dragPitch, initialYawRad + dragYaw, 0);
            renderer.render(scene, camera);
          }
          return;
        }
        pointerX = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        pointerY = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1;
      };
      const onUp = (event: PointerEvent) => {
        if (draggingId !== event.pointerId) return;
        draggingId = null;
        if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
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
      stage.addEventListener('pointerdown', onDown);
      stage.addEventListener('pointermove', onMove, { passive: true });
      stage.addEventListener('pointerup', onUp);
      stage.addEventListener('pointercancel', onUp);
      stage.addEventListener('pointerleave', onLeave);
      start();
      cleanup = () => {
        cancelAnimationFrame(requestId);
        resizeObserver.disconnect();
        observer.disconnect();
        document.removeEventListener('visibilitychange', onVisibility);
        stage.removeEventListener('pointerdown', onDown);
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerup', onUp);
        stage.removeEventListener('pointercancel', onUp);
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
  }, [enabled, initialYaw]);

  return (
    <div ref={stageRef} role="img" aria-label="Roca mineral tridimensional de MOTIL" className={`ld-stone-stage${force3D ? ' ld-stone-interactive' : ''}`} style={force3D ? { touchAction: 'none', cursor: 'grab' } : undefined}>
      <span ref={mountRef} className="ld-stone-tilt">
        {fallback ? <Image src="/brand/hero-stone.png" alt="" width={1024} height={1024} className="ld-stone" priority /> : null}
      </span>
    </div>
  );
}
