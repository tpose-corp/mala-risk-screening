import { Topbar } from "@/components/topbar";
import { PageHead } from "@/components/ui/card";
import { requireFacilityStaff } from "@/lib/session";
import { NewPatientForm } from "./new-patient-form";

export default async function NewPatientPage() {
  const user = await requireFacilityStaff();
  return (
    <>
      <Topbar menu="new" step={0} crumb="เพิ่มผู้ป่วยใหม่" />
      <main className="ui-page">
        <PageHead title="เพิ่มผู้ป่วยใหม่" subtitle="ระบบตรวจเลขบัตรประชาชนก่อนทุกครั้ง เพื่อไม่ให้ผู้ป่วยคนเดียวกันถูกลงทะเบียนซ้ำ" />
        <NewPatientForm facility={user.facility} />
      </main>
    </>
  );
}
