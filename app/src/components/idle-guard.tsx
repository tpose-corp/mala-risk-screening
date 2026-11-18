"use client";
// Idle timeout in the browser (the server enforces the same deadline, src/lib/session.ts):
// - real activity (mouse, keys, touch, scroll) tells the server at most once a minute (keepAlive)
// - 5 minutes before the deadline a popup counts down with a "ใช้งานต่อ" button
// - at the deadline the user is logged out and the login page says why
// Background refreshes (the inbox every 10 s) are not activity, so an unattended screen times out.
import { useCallback, useEffect, useRef, useState } from "react";
import { keepAlive, logoutIdle } from "@/app/actions";
import { Modal } from "@/components/ui/modal";

const WARN_BEFORE_MS = 5 * 60_000;
const PING_EVERY_MS = 60_000;

export function IdleGuard({ idleMinutes }: { idleMinutes: number }) {
  const idleMs = idleMinutes * 60_000;
  const lastActive = useRef(0);
  const lastPing = useRef(0);
  const [left, setLeft] = useState<number | null>(null); // ms left, shown only in the warning
  const ending = useRef(false);

  const ping = useCallback(async () => {
    lastPing.current = Date.now();
    const r = await keepAlive().catch(() => ({ ok: true }));
    if (!r.ok && !ending.current) { ending.current = true; await logoutIdle(); }
  }, []);

  useEffect(() => {
    lastActive.current = Date.now();
    lastPing.current = Date.now();
    const onActive = () => {
      lastActive.current = Date.now();
      if (Date.now() - lastPing.current > PING_EVERY_MS) void ping();
    };
    const events = ["mousedown", "keydown", "touchstart", "scroll", "wheel"] as const;
    events.forEach((e) => window.addEventListener(e, onActive, { passive: true }));
    const timer = setInterval(() => {
      const remaining = lastActive.current + idleMs - Date.now();
      if (remaining <= 0) {
        if (!ending.current) { ending.current = true; void logoutIdle(); }
        return;
      }
      setLeft(remaining <= WARN_BEFORE_MS ? remaining : null);
    }, 1000);
    return () => { events.forEach((e) => window.removeEventListener(e, onActive)); clearInterval(timer); };
  }, [idleMs, ping]);

  if (left === null) return null;
  const m = Math.floor(left / 60_000), s = Math.floor((left % 60_000) / 1000);
  return (
    <Modal tone="warn" title="ไม่มีการใช้งานมาสักพัก" closePrimary closeLabel="ใช้งานต่อ"
      onClose={() => { lastActive.current = Date.now(); setLeft(null); void ping(); }}>
      <p>ระบบจะออกจากระบบอัตโนมัติใน <b className="idle-left">{m}:{String(s).padStart(2, "0")}</b> นาที เพื่อความปลอดภัยของข้อมูลผู้ป่วย</p>
      <p className="ui-hint">กด &quot;ใช้งานต่อ&quot; ถ้ายังใช้งานอยู่</p>
    </Modal>
  );
}
