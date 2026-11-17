// App chrome for every logged-in page: builds the menu for the user's role and hands it to the
// client <Shell> (sidebar with folding sections, header with bell / user / log-out, manuals button).
// Still called <Topbar> so every page keeps working without changes.
// A Server Component, so it can read the user and the database directly.
import { Shell, type NavSection } from "@/components/ui/shell";
import { db } from "@/lib/db";
import { audiencesFor } from "@/lib/manuals";
import { HOSPITAL, ROLE_LABEL, homeOf, requireUser } from "@/lib/session";

const STEPS = ["ค้นหาผู้ป่วย", "กรอกข้อมูล", "ผลประเมิน", "แจ้งเตือนและคำแนะนำ", "ยืนยัน"];

type Menu = "patients" | "new" | "alerts" | "cases" | "audit" | "overview" | "users" | "facilities" | "apatients" | "criteria" | "settings" | "manuals" | "areas" | "amanuals";

export async function Topbar({ step, crumb, menu }: { step?: number; crumb?: string; menu?: Menu }) {
  const user = await requireUser();
  const hospital = user.role === "admin" || user.role === "clinician";
  const waiting = hospital ? await db.screening.count({ where: { isAlert: true, acknowledgedAt: null } }) : 0;
  const waitingDose = hospital ? await db.screening.count({ where: { isAlert: true, alertKind: "dose", acknowledgedAt: null } }) : 0;
  const pending = user.role === "admin" ? await db.patient.count({ where: { status: "pending", active: true } }) : 0;
  const manuals = await db.manual.findMany({
    where: { active: true, audience: { in: audiencesFor(user.role) } },
    select: { id: true, title: true },
    orderBy: { uploadedAt: "desc" },
    take: 8,
  });

  const sections: NavSection[] = [];
  if (user.role === "admin") {
    sections.push({
      key: "admin",
      label: "สำหรับผู้ดูแลระบบ",
      groups: [
        { items: [{ key: "overview", href: "/admin", label: "ภาพรวมระบบ", icon: "dashboard" }] },
        {
          head: "ข้อมูลหลัก",
          items: [
            { key: "apatients", href: "/admin/patients", label: "จัดการผู้ป่วย", icon: "patient", badge: pending, badgeTone: "warn" },
            { key: "users", href: "/admin/users", label: "บัญชีผู้ใช้", icon: "users" },
            { key: "facilities", href: "/admin/facilities", label: "หน่วยบริการ", icon: "building" },
          ],
        },
        {
          head: "ระบบ",
          items: [
            { key: "criteria", href: "/admin/criteria", label: "เกณฑ์การประเมิน", icon: "sliders" },
            { key: "settings", href: "/admin/settings", label: "ตั้งค่าระบบ", icon: "settings" },
            { key: "amanuals", href: "/admin/manuals", label: "จัดการคู่มือ", icon: "book" },
            { key: "audit", href: "/audit", label: "บันทึกการใช้งาน", icon: "clock" },
          ],
        },
      ],
    });
  }
  if (hospital) {
    sections.push({
      key: "hospital",
      label: "สำหรับแพทย์ / พยาบาล",
      groups: [{
        items: [
          { key: "alerts", href: "/hospital", label: "กล่องแจ้งเตือน", icon: "inbox", badge: waiting, badgeTone: waitingDose ? "hi" : "warn" },
          { key: "cases", href: "/hospital/cases", label: "ข้อมูลทุกเคส", icon: "archive" },
          { key: "areas", href: "/hospital/areas", label: "ยาและสมุนไพรรายพื้นที่", icon: "leaf" },
        ],
      }],
    });
  }
  if (user.role === "pcu") {
    sections.push({
      key: "pcu",
      label: "งานคัดกรอง",
      groups: [{
        items: [
          { key: "patients", href: "/patients", label: "ค้นหาผู้ป่วย", icon: "search" },
          { key: "new", href: "/patients/new", label: "เพิ่มผู้ป่วยใหม่", icon: "userPlus" },
        ],
      }],
    });
  }

  const initials = user.displayName.replace(/^(นพ\.|พญ\.|พว\.|ภก\.|นาย|นาง|น\.ส\.)\s*/, "").slice(0, 2);

  return (
    <Shell
      sections={sections}
      active={menu}
      home={homeOf(user.role)}
      crumb={{ place: user.facility ?? HOSPITAL, page: crumb }}
      user={{ name: user.displayName, role: ROLE_LABEL[user.role] ?? user.role, initials }}
      bell={hospital ? { count: waiting, href: waitingDose ? "/hospital?kind=dose" : "/hospital?kind=risk" } : undefined}
      manuals={manuals}
      steps={user.role === "pcu" && step !== undefined ? { labels: STEPS, current: step } : undefined}
    />
  );
}
