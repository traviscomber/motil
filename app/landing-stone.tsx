'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';

/*
 * MOTIL layered mineral hero
 * --------------------------
 * The object is built like a mineral specimen, not like a deformed sphere:
 * - 10 graphite slabs define the silhouette and cavities.
 * - 7 sulfide clusters create selective chalcopyrite/bornite highlights.
 * - 5 inner-core bodies add depth through the openings.
 * - 6 thin metallic plates act as veins between the larger masses.
 *
 * Each layer keeps its own transform so the whole specimen has subtle
 * parallax, similar to a product object assembled from parts.
 */

const POINTER_TILT_RAD = 0.085;

function seededWave(value: number, seed: number) {
  return (
    Math.sin(value * 11.73 + seed * 1.91) * 0.55 +
    Math.cos(value * 7.37 + seed * 2.63) * 0.45
  );
}

function makeJaggedSlab(
  THREE_NS: typeof import('three'),
  width: number,
  height: number,
  depth: number,
  seed: number,
  detail = 2
) {
  const geometry = new THREE_NS.DodecahedronGeometry(1, detail);
  const position = geometry.getAttribute('position');
  const v = new THREE_NS.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    v.fromBufferAttribute(position, index);

    const ridge = seededWave(v.x * 1.8 + v.y * 2.4 + v.z * 1.2, seed);
    const chip = seededWave(v.x * 4.7 - v.y * 3.1 + v.z * 5.2, seed + 17);
    const scale = 1 + ridge * 0.055 + chip * 0.022;

    position.setXYZ(
      index,
      v.x * width * 0.5 * scale,
      v.y * height * 0.5 * scale,
      v.z * depth * 0.5 * scale
    );
  }

  geometry.computeVertexNormals();
  return geometry;
}

function makeCrystal(
  THREE_NS: typeof import('three'),
  radius: number,
  seed: number
) {
  const geometry = new THREE_NS.DodecahedronGeometry(radius, 1);
  const position = geometry.getAttribute('position');
  const v = new THREE_NS.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    v.fromBufferAttribute(position, index);
    const n = seededWave(v.x * 3.7 + v.y * 5.1 + v.z * 4.4, seed);
    const scale = 1 + n * 0.055;
    position.setXYZ(index, v.x * scale, v.y * scale, v.z * scale);
  }

  geometry.computeVertexNormals();
  return geometry;
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

      const compactViewport = window.matchMedia('(max-width: 900px)').matches;
      const lowPower = compactViewport || navigator.hardwareConcurrency <= 4;
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
      renderer.toneMappingExposure = lowPower ? 1.16 : 1.24;
      renderer.domElement.setAttribute('aria-hidden', 'true');
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 50);
      camera.position.set(0.08, 0.10, 6.65);

      const graphite = new THREE.MeshPhysicalMaterial({
        color: 0x3b3933,
        roughness: 0.70,
        metalness: 0.16,
        clearcoat: 0.035,
        clearcoatRoughness: 0.76,
        flatShading: true,
      });
      graphite.envMapIntensity = lowPower ? 0.58 : 0.76;

      const graphiteDeep = graphite.clone();
      graphiteDeep.color.setHex(0x1c1c19);
      graphiteDeep.roughness = 0.78;

      const chalcopyrite = new THREE.MeshPhysicalMaterial({
        color: 0xa8732f,
        roughness: 0.23,
        metalness: 0.94,
        clearcoat: 0.07,
        clearcoatRoughness: 0.38,
        flatShading: true,
      });
      chalcopyrite.envMapIntensity = lowPower ? 0.82 : 1.04;

      const bornite = new THREE.MeshPhysicalMaterial({
        color: 0x55435c,
        roughness: 0.27,
        metalness: 0.90,
        clearcoat: 0.08,
        clearcoatRoughness: 0.33,
        sheen: 0.18,
        sheenColor: new THREE.Color(0x29445a),
        flatShading: true,
      });
      bornite.envMapIntensity = lowPower ? 0.78 : 0.98;

      const veinMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x885326,
        roughness: 0.28,
        metalness: 0.93,
        clearcoat: 0.04,
        flatShading: true,
      });
      veinMaterial.envMapIntensity = 0.88;

      const coreMaterial = new THREE.MeshStandardMaterial({
        color: 0x41281a,
        roughness: 0.42,
        metalness: 0.68,
        emissive: 0x6d2610,
        emissiveIntensity: lowPower ? 0.30 : 0.44,
        flatShading: true,
      });
      coreMaterial.envMapIntensity = 0.40;

      const assembly = new THREE.Group();
      const stoneLayer = new THREE.Group();
      const sulfideLayer = new THREE.Group();
      const veinLayer = new THREE.Group();
      const coreLayer = new THREE.Group();

      assembly.add(coreLayer, veinLayer, stoneLayer, sulfideLayer);
      assembly.rotation.set(-0.12, 0.58, 0.035);

      const slabData = [
        [-0.98, 0.78, 0.00, 2.35, 0.54, 1.26, -0.16, 0.18, 0.16, 1],
        [ 0.72, 0.92,-0.10, 2.08, 0.62, 1.32,  0.14,-0.28,-0.13, 2],
        [-0.76, 0.12, 0.38, 2.58, 0.58, 1.04,  0.20, 0.08,-0.09, 3],
        [ 0.84, 0.08, 0.02, 2.30, 0.62, 1.20, -0.14,-0.24, 0.11, 4],
        [-0.88,-0.58, 0.02, 2.18, 0.56, 1.28, -0.10, 0.20,-0.12, 5],
        [ 0.78,-0.72, 0.16, 1.90, 0.52, 1.12,  0.16,-0.20, 0.17, 6],
        [-1.48,-0.10,-0.36, 1.08, 1.52, 0.70,  0.12, 0.22, 0.30, 7],
        [ 1.44, 0.18,-0.30, 1.00, 1.48, 0.74, -0.10,-0.24,-0.26, 8],
        [-0.18, 1.34,-0.26, 1.56, 0.46, 0.92,  0.18, 0.10,-0.17, 9],
        [ 0.12,-1.22,-0.10, 1.62, 0.44, 0.96, -0.14,-0.06, 0.12,10],
      ] as const;

      const disposableGeometries: THREE.BufferGeometry[] = [];

      slabData.forEach((item, index) => {
        const [x,y,z,w,h,d,rx,ry,rz,seed] = item;
        const geometry = makeJaggedSlab(THREE, w, h, d, seed, lowPower ? 1 : 2);
        disposableGeometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, index % 3 === 0 ? graphiteDeep : graphite);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        stoneLayer.add(mesh);
      });

      const veinData = [
        [-0.32, 0.48, 0.70, 1.62, 0.13, 0.30,  0.02, 0.26, 0.20, 31],
        [ 0.66, 0.46, 0.54, 1.28, 0.12, 0.26, -0.18,-0.20,-0.10, 32],
        [-0.58,-0.08, 0.72, 1.44, 0.12, 0.28,  0.08, 0.18,-0.22, 33],
        [ 0.54,-0.22, 0.68, 1.38, 0.11, 0.30, -0.10,-0.10, 0.19, 34],
        [-0.36,-0.70, 0.52, 1.16, 0.11, 0.25,  0.12, 0.28,-0.09, 35],
        [ 0.74,-0.74, 0.40, 0.98, 0.10, 0.24, -0.08,-0.24, 0.15, 36],
      ] as const;

      veinData.forEach((item) => {
        const [x,y,z,w,h,d,rx,ry,rz,seed] = item;
        const geometry = makeJaggedSlab(THREE, w, h, d, seed, 3);
        disposableGeometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, veinMaterial);
        mesh.position.set(x, y, z);
        mesh.rotation.set(rx, ry, rz);
        veinLayer.add(mesh);
      });

      const sulfideData = [
        [-0.54, 0.36, 0.88, 0.42, 0.34, 0.38, chalcopyrite, 41],
        [ 0.22, 0.52, 0.82, 0.38, 0.46, 0.34, bornite,      42],
        [ 0.78, 0.14, 0.74, 0.38, 0.32, 0.36, chalcopyrite, 43],
        [-0.82,-0.28, 0.82, 0.36, 0.42, 0.32, bornite,      44],
        [ 0.02,-0.44, 0.96, 0.34, 0.28, 0.30, chalcopyrite, 45],
        [ 1.08, 0.58, 0.28, 0.28, 0.32, 0.30, bornite,      46],
        [-1.10, 0.72, 0.30, 0.30, 0.25, 0.32, chalcopyrite, 47],
      ] as const;

      sulfideData.forEach((item, index) => {
        const [x,y,z,sx,sy,sz,material,seed] = item;
        const geometry = makeCrystal(THREE, 0.72, seed);
        disposableGeometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.scale.set(sx, sy, sz);
        mesh.rotation.set(index * 0.27, index * 0.41, index * 0.17);
        sulfideLayer.add(mesh);
      });

      for (let index = 0; index < 5; index += 1) {
        const geometry = new THREE.DodecahedronGeometry(0.48 - index * 0.025, 1);
        disposableGeometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, coreMaterial);
        const angle = (index / 5) * Math.PI * 2;
        mesh.position.set(
          Math.cos(angle) * 0.58,
          (index - 2) * 0.18,
          Math.sin(angle) * 0.42 - 0.18
        );
        mesh.scale.set(1.08, 0.78, 0.88);
        mesh.rotation.set(index * 0.19, index * 0.31, -index * 0.12);
        coreLayer.add(mesh);
      }

      const tiltGroup = new THREE.Group();
      tiltGroup.add(assembly);
      scene.add(tiltGroup);

      scene.add(new THREE.HemisphereLight(0xe4ded0, 0x11100e, lowPower ? 0.58 : 0.72));

      const key = new THREE.DirectionalLight(0xffe6c7, lowPower ? 2.7 : 3.6);
      key.position.set(4.8, 5.8, 6.8);
      scene.add(key);

      const rim = new THREE.DirectionalLight(0x9fc5d8, lowPower ? 1.15 : 1.65);
      rim.position.set(-5.0, 2.4, -4.8);
      scene.add(rim);

      const fill = new THREE.DirectionalLight(0x8f8578, lowPower ? 0.55 : 0.78);
      fill.position.set(-2.4, 1.6, 5.0);
      scene.add(fill);

      const coreKick = new THREE.PointLight(0xc56835, lowPower ? 3.4 : 4.8, 6.5, 2);
      coreKick.position.set(0.4, -0.6, 2.6);
      scene.add(coreKick);

      const envScene = new THREE.Scene();
      const room = new THREE.Mesh(
        new THREE.BoxGeometry(13, 13, 13),
        new THREE.MeshBasicMaterial({ color: 0x11110f, side: THREE.BackSide })
      );
      envScene.add(room);

      const warmCard = new THREE.Mesh(
        new THREE.PlaneGeometry(4.4, 2.5),
        new THREE.MeshBasicMaterial({ color: 0xffe6cf })
      );
      warmCard.position.set(1.4, 6.0, 2.8);
      warmCard.rotation.x = Math.PI / 2;
      envScene.add(warmCard);

      const bronzeCard = new THREE.Mesh(
        new THREE.PlaneGeometry(3.1, 1.9),
        new THREE.MeshBasicMaterial({ color: 0x6f4825 })
      );
      bronzeCard.position.set(-5.9, 0.8, -2.6);
      bronzeCard.rotation.y = Math.PI / 2;
      envScene.add(bronzeCard);

      const coolCard = new THREE.Mesh(
        new THREE.PlaneGeometry(3.3, 2.0),
        new THREE.MeshBasicMaterial({ color: 0x37434a })
      );
      coolCard.position.set(5.9, 0.4, -2.0);
      coolCard.rotation.y = -Math.PI / 2;
      envScene.add(coolCard);

      const pmrem = new THREE.PMREMGenerator(renderer);
      const envRT = pmrem.fromScene(envScene, 0.08);
      scene.environment = envRT.texture;

      pmrem.dispose();
      room.geometry.dispose();
      (room.material as THREE.Material).dispose();
      warmCard.geometry.dispose();
      (warmCard.material as THREE.Material).dispose();
      bronzeCard.geometry.dispose();
      (bronzeCard.material as THREE.Material).dispose();
      coolCard.geometry.dispose();
      (coolCard.material as THREE.Material).dispose();

      const resize = () => {
        const size = mount.clientWidth || 560;
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
      let targetTiltX = 0.08;
      let targetTiltY = 0;
      let tiltX = 0.08;
      let tiltY = 0;

      const frame = (now: number) => {
        if (!visible || !pageVisible || reduceMotion) {
          running = false;
          renderer.render(scene, camera);
          return;
        }

        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        elapsed += dt;
        autoRotation += dt * 0.027;

        assembly.position.y = Math.sin(elapsed * 0.46) * 0.015;
        assembly.rotation.y = 0.58 + autoRotation;

        const parallax = Math.sin(elapsed * 0.34) * 0.006;
        stoneLayer.rotation.z = parallax * 0.45;
        sulfideLayer.rotation.z = -parallax * 0.72;
        veinLayer.rotation.y = parallax * 0.52;
        coreLayer.rotation.x = -parallax * 0.38;

        const ease = 1 - Math.pow(1 - 0.065, dt * 60);
        tiltX += (targetTiltX - tiltX) * ease;
        tiltY += (targetTiltY - tiltY) * ease;
        tiltGroup.rotation.x = tiltX;
        tiltGroup.rotation.y = tiltY;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(frame);
      };

      const startLoop = () => {
        if (running || !visible || !pageVisible) return;
        running = true;
        last = performance.now();

        if (reduceMotion) {
          renderer.render(scene, camera);
          running = false;
          return;
        }

        raf = requestAnimationFrame(frame);
      };

      const onMove = (event: PointerEvent) => {
        const rect = stage.getBoundingClientRect();
        const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
        targetTiltY = nx * POINTER_TILT_RAD;
        targetTiltX = 0.08 - ny * POINTER_TILT_RAD;
      };

      const onLeave = () => {
        targetTiltX = 0.08;
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
      }
      startLoop();

      cleanup = () => {
        running = false;
        cancelAnimationFrame(raf);
        resizeObserver.disconnect();
        intersectionObserver.disconnect();
        document.removeEventListener('visibilitychange', onVisibilityChange);
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerleave', onLeave);

        disposableGeometries.forEach((geometry) => geometry.dispose());
        graphite.dispose();
        graphiteDeep.dispose();
        chalcopyrite.dispose();
        bornite.dispose();
        veinMaterial.dispose();
        coreMaterial.dispose();
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
      aria-label="Mineral de sulfuros de cobre construido por capas de roca, vetas y cristales"
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
