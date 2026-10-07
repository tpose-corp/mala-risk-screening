// Top row of the summary-sheet card (steps 4 and 5): who the patient is, and the result.
// Colour is used only on the one result word.
import { ageFromThaiDob } from "@/lib/format";

export function CaseHead(props: { name: string; hn: string | null; dob: string; isAlert: boolean; status?: string }) {
  return (
    <div className="doc-head">
      <div>
        <div className="doc-label">ผู้ป่วย</div>
        <div className="doc-name">{props.name}</div>
        <div className="doc-meta">HN {props.hn ?? "ยังไม่มี"} อายุ {ageFromThaiDob(props.dob)} ปี</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div className="doc-label">ผลประเมิน</div>
        <div className="doc-status" style={{ color: props.isAlert ? "var(--hi)" : "var(--ok)" }}>
          {props.status ?? (props.isAlert ? "แจ้งเตือน" : "ไม่แจ้งเตือน")}
        </div>
      </div>
    </div>
  );
}
