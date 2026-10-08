'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type * as THREEType from 'three';

const GLB_URL = '/motil-rock.glb';

/**
 * The mineral's geometry and PBR materials come only from the supplied GLB.
 * The motion rig intentionally remains independent of mesh geometry.
 */
export default function LandingStone() {
  const stageRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLSpanElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
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
      renderer.toneMappingExposure = 1;
      renderer.domElement.setAttribute('aria-hidden', 'true');

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
      const orbit = new THREE.Group();
      scene.add(orbit);

      scene.add(new THREE.HemisphereLight(0xe8e3d6, 0x171715, 1.0));
      const key = new THREE.DirectionalLight(0xe8e3d6, 2.1);
      key.position.set(3, 5, 6);
      scene.add(key);
      const terracotta = new THREE.PointLight(0x9e4e3e, 26, 10, 2);
      terracotta.position.set(-3, 0.8, 3);
      scene.add(terracotta);
      const edge = new THREE.DirectionalLight(0xb0aba3, 0.85);
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
