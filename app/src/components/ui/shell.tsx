"use client";
// App shell (layout from the team's printing-request system): a white sidebar with folding
// sections (only the section of the current page is open, so the menu fits one screen), a header
// with the bell, the user chip and log-out, and a floating manuals button.
// On screens up to 1024px the sidebar becomes a drawer opened by the ☰ button.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { logout } from "@/app/actions";
import * as Ic from "./icons";

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
}) {
  const activeSection = props.sections.find((s) => s.groups.some((g) => g.items.some((i) => i.key === props.active)))?.key ?? props.sections[0]?.key;
  const [open, setOpen] = useState<string | undefined>(activeSection);
  const [drawer, setDrawer] = useState(false);
  const single = props.sections.length === 1;
  const fab = useFabState();
  const hasManuals = props.manuals.length > 0;

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
        <nav aria-label="เมนูหลัก">
          {props.sections.map((s) => {
            const isOpen = single || open === s.key;
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
                            <Link key={it.key} href={it.href} className={`ui-nav-item${props.active === it.key ? " active" : ""}`} onClick={() => setDrawer(false)}>
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

      <header className="ui-header">
        <div className="lead">
          <button type="button" className="ui-nav-toggle" aria-controls="ui-side" aria-expanded={drawer} aria-label="เมนู" onClick={() => setDrawer((d) => !d)}>
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
          <form action={logout}>
            <button type="submit" className="ui-logout" title="ออกจากระบบ" aria-label="ออกจากระบบ"><Ic.LogoutIcon /></button>
          </form>
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
      {hasManuals && fab.ready && !fab.state.docked && <ManualFab manuals={props.manuals} state={fab.state} save={fab.save} />}
    </>
  );
}

// ---- Manuals: floating button that can be dragged or tucked into the sidebar ----
// Same idea as the printing-request system: bottom-right by default; drag it and it snaps to the
// nearer side; "ซ่อนปุ่มนี้" moves it into the sidebar as a normal menu row. Saved per browser.
type Manual = { id: number; title: string };
type FabState = { side: "left" | "right"; bottom: number; docked: boolean };
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
    setDrag({ x: e.clientX, y: e.clientY });
  };
  const onUp = (e: React.PointerEvent) => {
    const s0 = start.current;
    start.current = null;
    if (!s0) return;
    if (!s0.moved) { setOpen((o) => !o); return; }
    setDrag(null);
    const side = e.clientX < window.innerWidth / 2 ? "left" : "right";
    const bottom = Math.min(window.innerHeight - 90, Math.max(16, window.innerHeight - e.clientY - 26));
    save({ ...state, side, bottom: Math.round(bottom) });
  };

  const style: React.CSSProperties = drag
    ? { left: drag.x - 26, top: drag.y - 26, right: "auto", bottom: "auto", transition: "none" }
    : { bottom: `calc(${state.bottom}px + var(--fab-lift, 0px))`, ...(state.side === "left" ? { left: "var(--fab-left)", right: "auto", alignItems: "flex-start" } : {}) };

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
