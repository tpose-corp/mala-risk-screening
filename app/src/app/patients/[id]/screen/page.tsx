// /patients/[id]/screen — [id] in the folder name means "any patient id goes here".
import { notFound } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ageFromThaiDob, thaiDate } from "@/lib/format";
import { requireFacilityStaff } from "@/lib/session";
import { ScreenForm } from "./screen-form";

export default async function ScreenPage({ params }: PageProps<"/patients/[id]/screen">) {
  const user = await requireFacilityStaff();
  const { id } = await params;
  const patientId = Number(id);

  const patient = Number.isInteger(patientId)
    ? await db.patient.findFirst({ where: { id: patientId, facility: user.facility } })
    : null;
  if (!patient) {
    // Exists but belongs to another facility: a refused access attempt, worth keeping in the log.
    if (Number.isInteger(patientId) && (await db.patient.count({ where: { id: patientId } })) > 0) {
      await audit({ user, action: "record.denied", entity: "Patient", entityId: patientId });
    }
    notFound();
  }

  await audit({ user, action: "patient.view", entity: "Patient", entityId: patient.id });

  // Last screening's measurements, shown under each field (as in the hospital's demo deck).
  const last = await db.screening.findFirst({ where: { patientId: patient.id }, orderBy: { createdAt: "desc" } });
  const prev = last
    ? { weightKg: last.weightKg, heightCm: last.heightCm, egfr: last.egfr, doseMgDay: last.doseMgDay, date: thaiDate(last.createdAt) }
    : null;

  return (
    <>
      <Topbar menu="patients" step={1} crumb="แบบคัดกรอง" />
      <main className="page">
        <div className="card" style={{ padding: "13px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {patient.name}{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12.5, marginLeft: 8 }}>HN {patient.hn ?? "รอจาก รพ."}</span>
            </div>
            <div className="meta">
              <span>{patient.sex}</span>
              <span>อายุ {ageFromThaiDob(patient.dob)} ปี</span>
              <span>เกิดวันที่ {patient.dob}</span>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)" }}>วันที่ประเมิน: {thaiDate(new Date())}</div>
        </div>
        <ScreenForm patientId={patient.id} sex={patient.sex} prev={prev} />
      </main>
    </>
  );
}
