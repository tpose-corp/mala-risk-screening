// The summary shown in the "ยืนยันรับเรื่อง" popup, built on the server from one screening.
import type { AckSummary } from "@/app/hospital/acknowledge-button";
import { ageFromThaiDob, thaiDateTime } from "./format";
import { alertReasons } from "./reasons";
import { waitText } from "./wait";

type S = Parameters<typeof alertReasons>[0] & {
  egfr: number; doseMgDay: number; bmi: number; facility: string; alertKind: string | null;
  alertRaisedAt: Date | null; createdAt: Date; nsaidNote: string | null; herbalNote: string | null;
  patient: { name: string; hn: string | null; sex: string; dob: string };
  screener: { displayName: string };
};

const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

export function ackSummary(s: S): AckSummary {
  const sent = s.alertRaisedAt ?? s.createdAt;
  const w = waitText(sent);
  return {
    name: s.patient.name,
    patientLine: `HN ${s.patient.hn ?? "ยังไม่มี"} ${s.patient.sex} ${ageFromThaiDob(s.patient.dob)} ปี`,
    from: `${s.facility} โดย ${s.screener.displayName}`,
    sentAt: thaiDateTime(sent),
    waited: w === "เพิ่งเข้ามา" ? w : `รอ ${w}`,
    kind: s.alertKind === "dose" ? "dose" : "risk",
    reasons: alertReasons(s),
    measured: `eGFR ${fmt(s.egfr)}, ขนาดยา ${s.doseMgDay} มก./วัน, BMI ${s.bmi.toFixed(1)}`,
    products: [s.nsaidNote, s.herbalNote].filter(Boolean).join(", ") || undefined,
  };
}
