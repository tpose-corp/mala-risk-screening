"use client";
// App shell (layout from the team's printing-request system): a white sidebar with folding
// sections (only the section of the current page is open, so the menu fits one screen), a header
// with the bell, the user chip and log-out, and a floating manuals button.
// On screens up to 1024px the sidebar becomes a drawer opened by the ☰ button.
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { logout } from "@/app/actions";
import * as Ic from "./icons";
import { Modal } from "./modal";
import { IdleGuard } from "@/components/idle-guard";

export type NavItem = { key: string; href: string; label: string; icon: keyof typeof ICONS; badge?: number; badgeTone?: "hi" | "warn" };
export type NavSection = { key: string; label: string; groups: { head?: string; items: NavItem[] }[] };

const ICONS = {
  dashboard: Ic.DashboardIcon, patient: Ic.PatientIcon, users: Ic.UsersIcon, building: Ic.BuildingIcon, sliders: Ic.SlidersIcon,
  settings: Ic.SettingsIcon, book: Ic.BookIcon, clock: Ic.ClockIcon, inbox: Ic.InboxIcon, archive: Ic.ArchiveIcon, leaf: Ic.LeafIcon,
  search: Ic.PatientIcon, userPlus: Ic.UserPlusIcon,
} satisfies Record<string, ComponentType<{ className?: string }>>;

export function Shell(props: {
  sections: NavSection[];
  active?: string;
  home: string;
  crumb: { place: string; page?: string };
  user: { name: string; role: string; initials: string };
  bell?: { count: number; href: string };
  manuals: { id: number; title: string }[];
  steps?: { labels: string[]; current: number };
  notice?: { text: string; href: string; link: string }; // warning bar on every page (รพ.สต. open cases)
  logoutWarn?: string; // shown in the log-out popup (รพ.สต. open cases)
  idleMinutes: number; // automatic log-out after this long without activity
}) {
  const activeSection = props.sections.find((s) => s.groups.some((g) => g.items.some((i) => i.key === props.active)))?.key ?? props.sections[0]?.key;
  const [open, setOpen] = useState<string | undefined>(activeSection);
  const [drawer, setDrawer] = useState(false);
  const single = props.sections.length === 1;
  const fab = useFabState();
  const hasManuals = props.manuals.length > 0;

  // Sidebar folds on every device. Wide screens: a narrow icon rail (remembered per browser);
  // narrower screens (≤ 1024px, where the sidebar is a drawer): slide it in and out.
  const rail = useSyncExternalStore(subscribeRail, readRail, () => false);
  useEffect(() => { document.body.classList.toggle("nav-rail", rail); }, [rail]);
  const toggleNav = () => {
    if (window.matchMedia("(max-width: 1024px)").matches) return setDrawer((d) => !d);
    saveRail(!rail);
  };

  // Smooth menu: the clicked item lights up at once (before the next page arrives), a highlight
  // slides from the old item to the new one, and a thin bar runs along the top while loading.
  // `picked` is cleared when the new page reports its own active item.
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const [pickedFor, setPickedFor] = useState(props.active);
  if (pickedFor !== props.active) { setPickedFor(props.active); setPicked(undefined); }
  const active = picked ?? props.active;
  const loading = picked !== undefined && picked !== props.active;
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [pillReady, setPillReady] = useState(false); // no slide on the very first placement
  useLayoutEffect(() => {
    const place = () => {
      const nav = navRef.current;
      const el = nav?.querySelector<HTMLElement>(`[data-nav="${active}"]`);
      if (!nav || !el || el.offsetParent === null || el.closest(".ui-nav-sec.collapsed")) return setPill(null);
      const n = nav.getBoundingClientRect(), r = el.getBoundingClientRect();
      setPill({ top: r.top - n.top, left: r.left - n.left, width: r.width, height: r.height });
    };
    place();
    const t = setTimeout(place, 280); // again after a section has finished folding open or shut
    const r = requestAnimationFrame(() => setPillReady(true));
    return () => { clearTimeout(t); cancelAnimationFrame(r); };
  }, [active, open, rail]);

  return (
    <>
      <aside className={`ui-side${drawer ? " open" : ""}`} id="ui-side">
        <Link href={props.home} className="ui-brand" title="กลับหน้าแรก">
          <span className="mark"><Ic.PulseIcon /></span>
          <span className="txt">
            <span className="name">MALA Screening</span>
            <span className="tagline">ระบบคัดกรองความเสี่ยง</span>
            <span className="sub">รพ.เชียงรายประชานุเคราะห์</span>
          </span>
        </Link>
        <nav aria-label="เมนูหลัก" ref={navRef} className="ui-nav">
          {pill && <span className={`ui-nav-pill${pillReady ? " ready" : ""}`} aria-hidden="true" style={{ transform: `translate(${pill.left}px, ${pill.top}px)`, width: pill.width, height: pill.height }} />}
          {props.sections.map((s) => {
            const isOpen = single || rail || open === s.key;
            return (
              <div key={s.key} className={`ui-nav-sec${isOpen ? "" : " collapsed"}`}>
                {!single && (
                  <button type="button" className="ui-nav-label" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? undefined : s.key)}>
                    <span>{s.label}</span>
                    <Ic.ChevronDown className="chev" />
                  </button>
                )}
                {single && <div className="ui-nav-label static"><span>{s.label}</span></div>}
                <div className="ui-nav-items">
                  <div>
                    {s.groups.map((g, gi) => (
                      <div key={gi}>
                        {g.head && <div className="ui-nav-subhead">{g.head}</div>}
                        {g.items.map((it) => {
                          const Icon = ICONS[it.icon];
                          return (
                            <Link key={it.key} href={it.href} data-nav={it.key} title={rail ? it.label : undefined} className={`ui-nav-item${active === it.key ? " active" : ""}`}
                              aria-current={active === it.key ? "page" : undefined}
                              onClick={(e) => {
                                setDrawer(false);
                                // plain click only (ctrl/cmd-click opens a new tab and stays here)
                                if (!e.defaultPrevented && !e.metaKey && !e.ctrlKey && !e.shiftKey && it.key !== props.active) setPicked(it.key);
                              }}>
                              <Icon />
                              <span>{it.label}</span>
                              {!!it.badge && <span className={`ui-nav-badge ${it.badgeTone ?? "hi"}`}>{it.badge}</span>}
                            </Link>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
        {hasManuals && fab.ready && fab.state.docked && (
          <ManualDock manuals={props.manuals} show={() => fab.save({ ...fab.state, docked: false })} />
        )}
      </aside>
      {drawer && <div className="ui-backdrop" onClick={() => setDrawer(false)} />}

      {loading && <div className="ui-loadbar" aria-hidden="true" />}
      <IdleGuard idleMinutes={props.idleMinutes} />
      <header className="ui-header">
        <div className="lead">
          <button type="button" className="ui-nav-toggle" aria-controls="ui-side" aria-expanded={drawer || !rail} aria-label={rail ? "กางเมนู" : "หุบเมนู"} title={rail ? "กางเมนู" : "หุบเมนู"} onClick={toggleNav}>
            <span /><span /><span />
          </button>
          <div className="crumb">
            {props.crumb.place}
            {props.crumb.page && <> <span aria-hidden="true">›</span> <strong>{props.crumb.page}</strong></>}
          </div>
        </div>
        <div className="actions">
          {props.bell && (
            <Link href={props.bell.href} className="ui-bell" title="แจ้งเตือนที่รอรับเรื่อง" aria-label={`แจ้งเตือนที่รอรับเรื่อง ${props.bell.count} เคส`}>
              <Ic.BellIcon />
              {props.bell.count > 0 && <span className="n">{props.bell.count > 99 ? "99+" : props.bell.count}</span>}
            </Link>
          )}
          <Link href="/account/password" className="ui-user" title="เปลี่ยนรหัสผ่าน">
            <span className="avatar">{props.user.initials}</span>
            <span className="who">
              <span>{props.user.name}</span>
              <small>{props.user.role}</small>
            </span>
          </Link>
          <LogoutButton warn={props.logoutWarn} />
        </div>
      </header>
      {props.steps && (
        <div className="ui-steps">
          <div className="steps5" aria-label="ขั้นตอนการคัดกรอง">
            {props.steps.labels.map((s, i) => (
              <span key={s} className={i === props.steps!.current ? "step-on" : i < props.steps!.current ? "step-done" : ""} aria-current={i === props.steps!.current ? "step" : undefined}>
                <i>{i < props.steps!.current ? "✓" : i + 1}</i>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
      {props.notice && (
        <div className="ui-notice" role="status">
          <span>{props.notice.text}</span>
          <Link href={props.notice.href} data-leave-ok>{props.notice.link}</Link>
        </div>
      )}
      {hasManuals && fab.ready && !fab.state.docked && <ManualFab manuals={props.manuals} state={fab.state} save={fab.save} />}
    </>
  );
}

// ---- Manuals: floating button that can be dragged or tucked into the sidebar ----
// Same idea as the printing-request system: bottom-right by default; drag it anywhere and it stays
// where it is dropped (kept on screen, below the app header); "ซ่อนปุ่มนี้" moves it into the
// sidebar as a normal menu row. Saved per browser. The position is kept as a distance from the
// nearer side and from the bottom, so it stays in the same corner area when the window resizes.
type Manual = { id: number; title: string };
// inset: px from the `side` edge (missing in older saved states: then the old snap positions apply)
type FabState = { side: "left" | "right"; bottom: number; inset?: number; docked: boolean };
const FAB_SIZE = 46;
const HEADER_H = 64;
const EDGE = 8;
// keeps the button's top-left corner inside the window and below the app header
function clampFab(x: number, y: number) {
  return {
    x: Math.min(window.innerWidth - FAB_SIZE - EDGE, Math.max(EDGE, x)),
    y: Math.min(window.innerHeight - FAB_SIZE - EDGE, Math.max(HEADER_H + EDGE, y)),
  };
}
const FAB_KEY = "mala.manualFab";
const FAB_DEFAULT: FabState = { side: "right", bottom: 24, docked: false };

// Read from localStorage through useSyncExternalStore: nothing on the server, the saved state
// in the browser, and every open tab stays in step. Falls back to memory if storage is blocked.
let memoryFab: string | null = null;
const readFab = () => { try { return localStorage.getItem(FAB_KEY); } catch { return memoryFab; } };
const subscribeFab = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("mala-fab", cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener("mala-fab", cb); };
};
function useFabState() {
  const raw = useSyncExternalStore(subscribeFab, readFab, () => "__server__");
  const ready = raw !== "__server__";
  let state = FAB_DEFAULT;
  try { if (ready && raw) state = { ...FAB_DEFAULT, ...JSON.parse(raw) }; } catch { /* bad value: default */ }
  const save = (next: FabState) => {
    const v = JSON.stringify(next);
    try { localStorage.setItem(FAB_KEY, v); } catch { memoryFab = v; }
    window.dispatchEvent(new Event("mala-fab"));
  };
  return { state, save, ready };
}

function ManualList({ manuals, footer }: { manuals: Manual[]; footer: React.ReactNode }) {
  return (
    <>
      <div className="ui-fab-title">คู่มือการใช้งาน</div>
      {manuals.map((m) => (
        <a key={m.id} role="menuitem" className="ui-fab-item" href={`/manuals/${m.id}`} target="_blank" rel="noopener noreferrer">
          <Ic.BookIcon /><span>{m.title}</span>
        </a>
      ))}
      {footer}
    </>
  );
}

// closes a popup on outside click / Esc
function useDismiss(open: boolean, close: () => void, ...refs: React.RefObject<HTMLElement | null>[]) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!refs.some((r) => r.current?.contains(e.target as Node))) close(); };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open, close, refs]);
}

function ManualFab({ manuals, state, save }: { manuals: Manual[]; state: FabState; save: (s: FabState) => void }) {
  const [open, setOpen] = useState(false);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, box);

  const onDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s0 = start.current;
    if (!s0) return;
    if (!s0.moved && Math.hypot(e.clientX - s0.x, e.clientY - s0.y) < 6) return; // a click, not a drag
    s0.moved = true;
    setOpen(false);
    setDrag(clampFab(e.clientX - FAB_SIZE / 2, e.clientY - FAB_SIZE / 2));
  };
  const onUp = (e: React.PointerEvent) => {
    const s0 = start.current;
    start.current = null;
    if (!s0) return;
    if (!s0.moved) { setOpen((o) => !o); return; }
    setDrag(null);
    const p = clampFab(e.clientX - FAB_SIZE / 2, e.clientY - FAB_SIZE / 2);
    const side = p.x + FAB_SIZE / 2 < window.innerWidth / 2 ? "left" : "right";
    const inset = side === "left" ? p.x : window.innerWidth - p.x - FAB_SIZE;
    const bottom = Math.max(EDGE, window.innerHeight - p.y - FAB_SIZE);
    save({ ...state, side, inset: Math.round(inset), bottom: Math.round(bottom) });
  };

  // min() keeps a saved position on screen after the window gets smaller
  const across = state.inset === undefined ? (state.side === "left" ? "var(--fab-left)" : "24px") : `min(${state.inset}px, calc(100vw - ${FAB_SIZE + EDGE}px))`;
  const style: React.CSSProperties = drag
    ? { left: drag.x, top: drag.y, right: "auto", bottom: "auto", transition: "none" }
    : {
        // pages with a sticky save bar lift the button above it, but only while it is in its default
        // place; once the user has dragged it, it stays exactly where it was dropped
        bottom: `min(${state.inset === undefined ? `calc(${state.bottom}px + var(--fab-lift, 0px))` : `${state.bottom}px`}, calc(100vh - ${HEADER_H + EDGE + FAB_SIZE}px))`,
        ...(state.side === "left" ? { left: across, right: "auto", alignItems: "flex-start" } : { right: across }),
      };

  return (
    <div className={`ui-fab${drag ? " dragging" : ""}`} ref={box} style={style}>
      {open && (
        <div className={`ui-fab-menu ${state.bottom > 320 ? "below" : ""}`} role="menu">
          <ManualList manuals={manuals} footer={
            <button type="button" className="ui-fab-all" onClick={() => { setOpen(false); save({ ...state, docked: true }); }}>
              ซ่อนปุ่มนี้ (ย้ายไปไว้ที่เมนูข้าง)
            </button>
          } />
        </div>
      )}
      <button type="button" className="ui-fab-btn" aria-haspopup="true" aria-expanded={open}
        title="คู่มือการใช้งาน (ลากเพื่อย้ายได้)" aria-label="คู่มือการใช้งาน"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); } }}>
        <Ic.BookIcon />
      </button>
    </div>
  );
}

// Folded-sidebar choice, kept in localStorage (memory if storage is blocked); every tab follows.
let memoryRail = false;
const readRail = () => { try { return localStorage.getItem("mala.navRail") === "1"; } catch { return memoryRail; } };
const saveRail = (v: boolean) => {
  try { localStorage.setItem("mala.navRail", v ? "1" : "0"); } catch { memoryRail = v; }
  window.dispatchEvent(new Event("mala-rail"));
};
const subscribeRail = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("mala-rail", cb);
  return () => { window.removeEventListener("storage", cb); window.removeEventListener("mala-rail", cb); };
};

// Log out with a check first. If the รพ.สต. still has open cases, the popup says so.
function LogoutButton({ warn }: { warn?: string }) {
  const [open, setOpen] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  return (
    <form ref={form} action={logout}>
      <button type="button" className="ui-logout" title="ออกจากระบบ" aria-label="ออกจากระบบ" onClick={() => setOpen(true)}><Ic.LogoutIcon /></button>
      {open && (
        <Modal title="ออกจากระบบใช่ไหม" onClose={() => setOpen(false)} closeLabel="ยกเลิก"
          actions={<button type="button" className="ui-btn primary" onClick={() => form.current?.requestSubmit()}>ออกจากระบบ</button>}>
          <p>เมื่อออกจากระบบแล้ว ต้องเข้าสู่ระบบใหม่เพื่อใช้งานต่อ</p>
          {warn && <p className="logout-warn">{warn}</p>}
        </Modal>
      )}
    </form>
  );
}

// The sidebar row that replaces the floating button once it is hidden.
function ManualDock({ manuals, show }: { manuals: Manual[]; show: () => void }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const pop = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setPos(null), []);
  useDismiss(!!pos, close, btn, pop);
  // open beside the row (fixed, so the sidebar's scroll area cannot clip it); keep it on screen
  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect();
    const narrow = window.innerWidth <= 1024;
    setPos({ top: Math.max(12, Math.min(r.top - 8, window.innerHeight - 220)), left: narrow ? 16 : r.right + 10 });
  };
  return (
    <div className="ui-nav-dock">
      <button ref={btn} type="button" className={`ui-nav-item${pos ? " active" : ""}`} aria-haspopup="true" aria-expanded={!!pos} onClick={toggle}>
        <Ic.BookIcon /><span>คู่มือการใช้งาน</span>
      </button>
      {pos && (
        <div className="ui-fab-menu ui-dock-pop" role="menu" ref={pop} style={{ top: pos.top, left: pos.left }}>
          <ManualList manuals={manuals} footer={
            <button type="button" className="ui-fab-all" onClick={() => { setPos(null); show(); }}>แสดงปุ่มลอยอีกครั้ง</button>
          } />
        </div>
      )}
    </div>
  );
}
