"use client";
// The "screen saver" on the closed page: a nurse badge (drawn for this app, not anyone's logo)
// drifts across the screen and bounces off the edges like an old DVD player's idle logo, taking a
// new colour at every bounce. It uses the whole screen and passes behind the message card (like
// the DVD logo going behind a menu), and ignores the mouse.
// - prefers-reduced-motion: it stays still in a corner
// - the browser pauses requestAnimationFrame in a hidden tab, so it costs nothing there
import { useEffect, useRef } from "react";

const COLORS = ["#990066", "#0f766e", "#2563eb", "#c2410c", "#7c3aed", "#15803d"];
const SPEED = 110; // px per second on each axis

export function BouncingNurse() {
  const box = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current, inner = art.current;
    if (!el || !inner) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("still");
      return;
    }
    const w = el.offsetWidth, h = el.offsetHeight;
    let x = Math.random() * Math.max(1, window.innerWidth - w);
    let y = Math.random() * Math.max(1, window.innerHeight - h);
    let dx = SPEED * (Math.random() < 0.5 ? -1 : 1);
    let dy = SPEED * 0.8 * (Math.random() < 0.5 ? -1 : 1);
    let color = 0;
    let last = performance.now();
    let raf = 0;

    const bounce = () => {
      color = (color + 1) % COLORS.length;
      el.style.color = COLORS[color];
      inner.animate(
        [{ transform: "scale(1)" }, { transform: "scale(1.08, .93)" }, { transform: "scale(1)" }],
        { duration: 260, easing: "ease-out" },
      );
    };
    const step = (now: number) => {
      const t = Math.min(0.05, (now - last) / 1000); // a long pause (tab switch) must not jump
      last = now;
      const maxX = window.innerWidth - w, maxY = window.innerHeight - h;
      x += dx * t;
      y += dy * t;
      let hit = false;
      if (x <= 0) { x = 0; dx = Math.abs(dx); hit = true; }
      else if (x >= maxX) { x = Math.max(0, maxX); dx = -Math.abs(dx); hit = true; }
      if (y <= 0) { y = 0; dy = Math.abs(dy); hit = true; }
      else if (y >= maxY) { y = Math.max(0, maxY); dy = -Math.abs(dy); hit = true; }
      if (hit) bounce();
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(step);
    };
    el.style.color = COLORS[0];
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={box} className="cl-bouncer" aria-hidden="true">
      <div ref={art} className="cl-bouncer-art">
        <svg viewBox="0 0 176 176" width="100%" height="100%">
          <defs>
            <clipPath id="cl-badge"><circle cx="80" cy="92" r="76" /></clipPath>
          </defs>
          <circle cx="80" cy="92" r="76" fill="#fff" />
          <g clipPath="url(#cl-badge)">
            <circle cx="80" cy="92" r="76" fill="currentColor" opacity=".1" />
            {/* uniform with a white collar and a small cross */}
            <path d="M24 176c0-36 25-52 56-52s56 16 56 52z" fill="currentColor" />
            <path d="M66 125l14 17 14-17z" fill="#fff" />
            <rect x="106" y="146" width="12" height="4" rx="1.2" fill="#fff" />
            <rect x="110" y="142" width="4" height="12" rx="1.2" fill="#fff" />
            {/* neck, hair, face */}
            <rect x="71" y="106" width="18" height="22" rx="6" fill="#efc2a2" />
            <ellipse cx="80" cy="80" rx="37" ry="39" fill="#3b2a2f" />
            <ellipse cx="80" cy="84" rx="28" ry="31" fill="#f7d5bb" />
            <path d="M52 80c0-21 13-30 28-30s28 9 28 30c-8-11-17-15-28-14-11-1-20 3-28 14z" fill="#3b2a2f" />
            {/* nurse cap with the cross in the badge colour */}
            <path d="M54 54c0-14 12-21 26-21s26 7 26 21l-4 6H58z" fill="#fff" stroke="#e6dce1" strokeWidth="1.5" />
            <rect x="76.5" y="37" width="7" height="17" rx="1.5" fill="currentColor" />
            <rect x="71.5" y="42" width="17" height="7" rx="1.5" fill="currentColor" />
            {/* eyes blink, cheeks, smile */}
            <g className="cl-eyes" fill="#3b2a2f">
              <ellipse cx="70" cy="86" rx="3.2" ry="3.8" />
              <ellipse cx="90" cy="86" rx="3.2" ry="3.8" />
            </g>
            <circle cx="62" cy="96" r="5" fill="#f2a1a1" opacity=".55" />
            <circle cx="98" cy="96" r="5" fill="#f2a1a1" opacity=".55" />
            <path d="M72 100q8 7 16 0" stroke="#b0566b" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          </g>
          <circle cx="80" cy="92" r="76" fill="none" stroke="currentColor" strokeWidth="5" />
          {/* medical cross that beats like a heart */}
          <g className="cl-beat">
            <circle cx="144" cy="32" r="24" fill="currentColor" stroke="#fff" strokeWidth="4" />
            <rect x="139" y="18" width="10" height="28" rx="2" fill="#fff" />
            <rect x="130" y="27" width="28" height="10" rx="2" fill="#fff" />
          </g>
        </svg>
      </div>
    </div>
  );
}
