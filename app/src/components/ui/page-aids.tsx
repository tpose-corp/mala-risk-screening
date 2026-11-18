"use client";
// Helpers for long pages (first used on the audit log):
// - measures the sticky page head and puts its bottom edge in the CSS variable --head-bottom,
//   so toolbars and table heads can stick right under it (the head's height changes with the
//   window width, so a fixed number would be wrong)
// - a "กลับขึ้นด้านบน" button that appears once the page is scrolled down a screen or so, centred
//   under the page content (measured, so it stays centred when the sidebar is folded or opened),
//   and lifted above a save bar only while that bar sits at the bottom of the screen
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function PageAids() {
  const [show, setShow] = useState(false);
  const [center, setCenter] = useState<number | null>(null);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const root = document.documentElement;
    const head = document.querySelector<HTMLElement>(".ui-sticky");
    const measure = () => {
      const top = 64; // the app's top bar
      root.style.setProperty("--head-bottom", `${top + (head?.offsetHeight ?? 0)}px`);
    };
    const main = document.querySelector<HTMLElement>("main");
    // save bars that stick to the bottom of the screen (settings, criteria, the admin edit cards)
    const BARS = ".ui-savebar, .ui-card-sticky-actions .ui-form-actions, .pe-card.editing .pe-bar";
    const place = () => {
      measure();
      if (main) { const r = main.getBoundingClientRect(); setCenter(Math.round(r.left + r.width / 2)); }
      onScroll(); // an edit card opening or closing changes where the save bar is
    };
    place();
    const ro = new ResizeObserver(place);
    if (head) ro.observe(head);
    if (main) ro.observe(main);
    window.addEventListener("resize", place);
    // folding the sidebar slides <main> sideways without resizing it: re-measure when it settles
    document.addEventListener("transitionend", place);
    function onScroll() {
      setShow(window.scrollY > window.innerHeight * 0.9);
      let up = 0;
      for (const el of document.querySelectorAll<HTMLElement>(BARS)) {
        if (el.closest("[inert]")) continue;
        const r = el.getBoundingClientRect();
        // the button's own spot is the bottom 70px of the screen: move it above any bar inside that strip
        if (r.height > 0 && r.top < window.innerHeight && r.bottom > window.innerHeight - 70) up = Math.max(up, Math.round(window.innerHeight - r.top));
      }
      setLift(up);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { ro.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", place); document.removeEventListener("transitionend", place); root.style.removeProperty("--head-bottom"); };
  }, []);

  const toTop = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  };

  // Rendered into <body>: the page's fade-in animation puts a transform on <main>, and a
  // position: fixed element inside a transformed parent is placed relative to that parent.
  if (center === null) return null;
  return createPortal(
    <button type="button" className={`ui-totop${show ? " on" : ""}`} onClick={toTop} style={{ left: center, bottom: lift ? lift + 14 : undefined }} aria-label="กลับขึ้นด้านบน" tabIndex={show ? 0 : -1}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
      กลับขึ้นด้านบน
    </button>,
    document.body,
  );
}
