"use client";
// Heart-monitor trace for the login page, drawn like a real bedside monitor: a "pen" sweeps
// left to right writing the signal, with a small erased gap just ahead of it; at the right edge
// it wraps to the left and keeps writing over the old trace. The line therefore never breaks.
//
// The signal is generated live, beat by beat, in the same sharp zig-zag as the logo, with each
// beat's height, depth, width and spacing a little different and a slow baseline wander, so no
// two beats look the same. Decorative only (aria-hidden).
// With "reduce motion" on, one still trace is drawn and nothing moves.

import { useEffect, useRef } from "react";

const SPEED = 80; // px per second the pen moves
const GAP = 12; // erased px ahead of the pen

// One beat, drawn with straight strokes like the logo (flat, sharp peak up, deep dip down,
// back to the line), as [seconds from the start of the beat, height] corners. Every beat gets
// its own height, depth, width and spacing; some also get a small sharp bump after the spike.
type Beat = { seconds: number; pts: [number, number][] };
function makeBeat(): Beat {
  const r = (a: number, b: number) => a + (b - a) * Math.random();
  const peak = r(0.55, 1.15);
  const dip = peak * r(0.45, 0.85);
  let t = r(0.12, 0.3); // flat lead-in
  const pts: [number, number][] = [[0, 0], [t, 0]];
  t += r(0.035, 0.06); pts.push([t, peak]); // up to the peak
  t += r(0.06, 0.095); pts.push([t, -dip]); // down past the line
  t += r(0.035, 0.06); pts.push([t, 0]); // back to the line
  if (Math.random() < 0.65) {
    const bump = peak * r(0.12, 0.28);
    t += r(0.1, 0.18); pts.push([t, 0]);
    t += r(0.05, 0.08); pts.push([t, bump]);
    t += r(0.05, 0.08); pts.push([t, 0]);
  }
  const seconds = Math.max(t + r(0.12, 0.35), r(0.6, 1.1));
  pts.push([seconds, 0]);
  return { seconds, pts };
}

// Height of the beat at time `at` (straight lines between the corners).
function heightAt(b: Beat, at: number) {
  for (let i = 1; i < b.pts.length; i++) {
    const [t1, v1] = b.pts[i];
    if (at <= t1) {
      const [t0, v0] = b.pts[i - 1];
      return t1 === t0 ? v1 : v0 + ((v1 - v0) * (at - t0)) / (t1 - t0);
    }
  }
  return 0;
}

export function EcgLine({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let ys: (number | null)[] = [];
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      w = Math.max(1, Math.round(canvas.clientWidth));
      h = Math.max(1, Math.round(canvas.clientHeight));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ys = new Array(w).fill(null);
    };
    resize();

    // signal generator state
    let beat = makeBeat();
    let phase = 0; // seconds into the current beat
    let t = 0; // total seconds, for the baseline wander
    const sample = (dt: number) => {
      phase += dt;
      t += dt;
      while (phase >= beat.seconds) {
        phase -= beat.seconds;
        beat = makeBeat();
      }
      return heightAt(beat, phase) + Math.sin(t * 0.9) * 0.03; // slow breathing-like wander
    };
    const toY = (v: number) => h * 0.55 - v * h * 0.4;

    const draw = (head: number) => {
      ctx.clearRect(0, 0, w, h);
      // Same stroke as the logo: 2px, round ends and corners. Older trace fades out like the
      // afterglow on a real monitor (bright at the pen, dim far behind it).
      ctx.lineWidth = 1.75;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      for (let x = 1; x < w; x++) {
        const ahead = (x - head + w) % w; // distance in front of the pen
        const y0 = ys[x - 1];
        const y1 = ys[x];
        if (y0 === null || y1 === null || (ahead > 0 && ahead <= GAP + 1)) continue;
        const age = (head - x + w) % w; // px behind the pen
        const glow = Math.pow(1 - age / w, 1.6);
        // the same soft white as the page's secondary text, dimming behind the pen
        // pink-tinted at the pen (the hospital colour), soft white further back
        ctx.strokeStyle = `rgba(255, ${Math.round(255 - 50 * glow * glow)}, ${Math.round(255 - 22 * glow * glow)}, ${(0.14 + 0.7 * glow).toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x - 1, y0);
        ctx.lineTo(x, y1);
        ctx.stroke();
      }
      // the pen: a small bright dot
      const hy = ys[head];
      if (hy !== null && hy !== undefined) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        ctx.shadowColor = "rgba(255, 196, 230, 0.8)";
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(head, hy, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (let x = 0; x < w; x++) ys[x] = toY(sample(1 / SPEED));
      draw(-GAP - 1);
      return;
    }

    let head = 0;
    let last = performance.now();
    let carry = 0;
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000); // a background tab must not jump ahead
      last = now;
      carry += dt * SPEED;
      while (carry >= 1) {
        carry -= 1;
        head = (head + 1) % w;
        ys[head] = toY(sample(1 / SPEED));
      }
      draw(head);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    const onResize = () => { resize(); head = 0; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
