'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

/* Interactive hero stone: display-pedestal sway + pointer tilt + click spin.
   A flat mineral PNG can never spin edge-on like resend's solid cube, so the
   rotation language is adapted: slow oscillation when idle, pointer-follow
   tilt on hover, and one full eased 360° turn per click/tap. */

const IDLE_SWAY_DEG = 12;
const IDLE_FLOAT_PX = 8;
const POINTER_TILT_DEG = 10;
const SPIN_DURATION_MS = 1400;
const SPIN_DURATION_REDUCED_MS = 500;

export default function LandingStone() {
  const stageRef = useRef<HTMLButtonElement>(null);
  const tiltRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const tilt = tiltRef.current;
    if (!stage || !tilt) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spinMs = reduceMotion ? SPIN_DURATION_REDUCED_MS : SPIN_DURATION_MS;

    let raf = 0;
    let last = performance.now();
    let phase = Math.random() * Math.PI * 2;
    let targetX = 0;
    let targetY = 0;
    let curX = 0;
    let curY = 0;
    let spinFrom = 0;
    let spinTo = 0;
    let spinStart = 0;
    let spinning = false;

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // Automatic motion (sway, float, pointer tilt) is ambient decoration:
      // it stops entirely under prefers-reduced-motion. The click spin is
      // user-initiated, so it stays available (faster) at every tier.
      let idleY = 0;
      let floatY = 0;
      if (!reduceMotion) {
        phase += dt * 0.5;
        const k = 1 - Math.pow(1 - 0.07, dt * 60);
        curX += (targetX - curX) * k;
        curY += (targetY - curY) * k;
        idleY = Math.sin(phase) * IDLE_SWAY_DEG;
        floatY = Math.sin(phase * 0.8) * IDLE_FLOAT_PX;
      }

      let spin = 0;
      if (spinning) {
        const t = Math.min((now - spinStart) / spinMs, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        spin = spinFrom + (spinTo - spinFrom) * eased;
        if (t >= 1) {
          spinning = false;
          spinFrom = spinTo % 360;
        }
      }

      tilt.style.transform = `translateY(${floatY.toFixed(2)}px) rotateX(${curX.toFixed(2)}deg) rotateY(${(idleY + curY + spin).toFixed(2)}deg)`;
      raf = requestAnimationFrame(frame);
    };

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      const nx = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = ((event.clientY - rect.top) / rect.height) * 2 - 1;
      targetY = nx * POINTER_TILT_DEG;
      targetX = -ny * POINTER_TILT_DEG * 0.7;
    };
    const onLeave = () => {
      targetX = 0;
      targetY = 0;
    };
    const onClick = () => {
      // Continue from the current eased angle so repeated clicks never jump.
      const now = performance.now();
      if (spinning) {
        const t = Math.min((now - spinStart) / spinMs, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        spinFrom = spinFrom + (spinTo - spinFrom) * eased;
      }
      spinTo = spinFrom + 360;
      spinStart = now;
      spinning = true;
    };

    if (!reduceMotion) {
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerleave', onLeave);
    }
    stage.addEventListener('click', onClick);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      stage.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <button
      ref={stageRef}
      type="button"
      aria-label="Girar la piedra mineral"
      className="ld-stone-stage"
    >
      <span ref={tiltRef} className="ld-stone-tilt">
        <Image
          src="/brand/hero-stone.png"
          alt=""
          width={1024}
          height={1024}
          priority
          className="ld-stone"
        />
      </span>
    </button>
  );
}
