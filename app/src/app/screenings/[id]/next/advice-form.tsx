"use client";

import { useActionState, useState } from "react";
import { submitWithoutReset } from "@/lib/submit";
import { markAdviceGiven } from "../actions";

export function AdviceForm({ screeningId }: { screeningId: number }) {
  const [state, action, pending] = useActionState(markAdviceGiven.bind(null, screeningId), undefined);
  const [advised, setAdvised] = useState(false);

  return (
    <form onSubmit={submitWithoutReset(action)} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label className="check">
        <input type="checkbox" name="advised" checked={advised} onChange={(e) => setAdvised(e.target.checked)} />
        ข้าพเจ้าได้แจ้งคำแนะนำนี้ให้ผู้ป่วยรับทราบแล้ว
      </label>
      {state?.error && <div className="err" role="alert">{state.error}</div>}
      <button className="btn" type="submit" disabled={!advised || pending}>ดำเนินการต่อ</button>
    </form>
  );
}
