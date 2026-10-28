import { Topbar } from "@/components/topbar";
import { requireFacilityStaff } from "@/lib/session";
import { NewPatientForm } from "./new-patient-form";

export default async function NewPatientPage() {
  const user = await requireFacilityStaff();
  return (
    <>
      <Topbar menu="new" step={0} crumb="เพิ่มผู้ป่วยใหม่" />
      <main className="page">
        <NewPatientForm facility={user.facility} />
      </main>
    </>
  );
}
