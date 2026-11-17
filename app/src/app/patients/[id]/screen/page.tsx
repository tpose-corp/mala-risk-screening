// /patients/[id]/screen — [id] in the folder name means "any patient id goes here".
// ?edit=<screeningId> opens an existing, NOT yet confirmed screening for changes.
import { notFound, redirect } from "next/navigation";
import { Topbar } from "@/components/topbar";
import { audit } from "@/lib/audit";
import { db } from "@/lib/db";
import { ageFromThaiDob, maskCardId, thaiDate, thaiDateTime } from "@/lib/format";
import { requireFacilityStaff } from "@/lib/session";
import { ScreenForm } from "./screen-form";

export default async function ScreenPage({ params, searchParams }: PageProps<"/patients/[id]/screen">) {
  const user = await requireFacilityStaff();
  const { id } = await params;
  const { edit } = await searchParams;
  const patientId = Number(id);

  const patient = Number.isInteger(patientId)
    ? await db.patient.findFirst({ where: { id: patientId, facility: user.facility, active: true } })
    : null;
  if (!patient) {
    // Exists but belongs to another facility: a refused access attempt, worth keeping in the log.
    if (Number.isInteger(patientId) && (await db.patient.count({ where: { id: patientId } })) > 0) {
      await audit({ user, action: "record.denied", entity: "Patient", entityId: patientId });
    }
    notFound();
  }

  const editId = typeof edit === "string" ? Number(edit) : NaN;
  const editing = Number.isInteger(editId)
    ? await db.screening.findFirst({ where: { id: editId, patientId: patient.id, facility: user.facility } })
    : null;
  if (editing?.confirmedAt) redirect(`/screenings/${editing.id}?locked=1`);

  await audit({ user, action: "patient.view", entity: "Patient", entityId: patient.id });

  // Last screening's measurements, shown under each field (as in the hospital's demo deck).
  const last = await db.screening.findFirst({
    where: { patientId: patient.id, ...(editing ? { id: { not: editing.id }, createdAt: { lt: editing.createdAt } } : {}) },
    orderBy: { createdAt: "desc" },
  });
  const prev = last
    ? { weightKg: last.weightKg, heightCm: last.heightCm, egfr: last.egfr, doseMgDay: last.doseMgDay, date: thaiDate(last.createdAt) }
    : null;

  return (
    <>
      <Topbar menu="patients" step={1} crumb={editing ? "แก้ไขผลคัดกรอง" : "แบบคัดกรอง"} />
      <main className="page">
        <div className="card" style={{ padding: "13px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>
              {patient.name}{" "}
              <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 12.5, marginLeft: 8 }}>HN {patient.hn ?? "รอ รพ. เพิ่มให้"}</span>
              {patient.status === "pending" && <span className="pill warn" style={{ marginLeft: 8 }}>รอยืนยันตัวตน</span>}
            </div>
            <div className="meta">
              <span className="mono">{maskCardId(patient.cardId)}</span>
              <span>{patient.sex}</span>
              <span>อายุ {ageFromThaiDob(patient.dob)} ปี</span>
              <span>เกิดวันที่ {patient.dob}</span>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "right" }}>
            {editing ? (
              <>กำลังแก้ไขผลที่บันทึกเมื่อ {thaiDateTime(editing.createdAt)}<br />แก้ไขได้จนกว่าจะกดยืนยันและส่ง รพ.</>
            ) : (
              <>วันที่ประเมิน: {thaiDateTime(new Date())}</>
            )}
          </div>
        </div>
        <ScreenForm
          patientId={patient.id}
          sex={patient.sex}
          prev={prev}
          screeningId={editing?.id ?? null}
          initial={editing}
        />
      </main>
    </>
  );
}
