// /closed — shown when the hospital admin has switched off the system for this user's role.
import Link from "next/link";
import { connection } from "next/server";
import { logout } from "@/app/actions";
import { getSettings } from "@/lib/settings";

export default async function ClosedPage() {
  await connection(); // read the settings per request, never at build time
  const s = await getSettings();
  return (
    <main className="page" style={{ maxWidth: 520, margin: "80px auto" }}>
      <div className="card pad" style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "center" }}>
        <h1 className="h1">ระบบปิดใช้งานชั่วคราว</h1>
        <p style={{ color: "var(--ink-2)", lineHeight: 1.7 }}>{s.closedMessage}</p>
        <p className="note">ติดต่อ: {s.adminContact}</p>
        <form action={logout}><button className="btn-s" type="submit">ออกจากระบบ</button></form>
        <Link href="/login" className="note">กลับไปหน้าเข้าสู่ระบบ</Link>
      </div>
    </main>
  );
}
