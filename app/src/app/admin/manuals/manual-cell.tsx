"use client";
// One cell of the manuals table: the file (its name opens it) or "ยังไม่ได้อัปโหลด", then the
// buttons. Picking a file uploads it at once. "ลบ" asks first.
import { useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { removeManual, uploadManual } from "./actions";

type File_ = { id: number; fileName: string; size: string; uploaded: string };

export function ManualCell({ audience, label, file }: { audience: string; label: string; file: File_ | null }) {
  const form = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const del = useRef<HTMLFormElement>(null);

  return (
    <div className="mn-cell">
      <div className="mn-file">
        {file ? (
          <>
            <a className="mn-file-link" href={`/manuals/${file.id}`} target="_blank" rel="noopener noreferrer" title={file.uploaded}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 4h6a4 4 0 014 4v13a3 3 0 00-3-3H2zM22 4h-6a4 4 0 00-4 4v13a3 3 0 013-3h7z" /></svg>
              <span className="mn-file-name">{file.fileName}</span>
            </a>
            <span className="mn-file-size">{file.size} {file.uploaded}</span>
          </>
        ) : (
          <span className="mn-empty">ยังไม่ได้อัปโหลด</span>
        )}
      </div>
      <div className="mn-actions">
        <form ref={form} action={uploadManual.bind(null, audience)}>
          <label className={file ? "mn-link" : "ui-btn secondary sm"} aria-busy={busy}>
            <input type="file" name="file" accept="application/pdf,.pdf" hidden
              onChange={(e) => { if (e.target.files?.length) { setBusy(true); form.current?.requestSubmit(); } }} />
            {busy ? "กำลังอัปโหลด…" : file ? "เปลี่ยนไฟล์" : "+ อัปโหลด PDF"}
          </label>
        </form>
        {file && (
          <form ref={del} action={removeManual.bind(null, audience)}>
            <button type="button" className="mn-link danger" onClick={() => setAsking(true)}>ลบ</button>
          </form>
        )}
      </div>
      {asking && file && (
        <Modal title="ลบคู่มือนี้?" onClose={() => setAsking(false)} closeLabel="ยกเลิก"
          actions={<button type="button" className="ui-btn solid-danger" onClick={() => { del.current?.requestSubmit(); setAsking(false); }}>ลบคู่มือ</button>}>
          <p>{label}: <b>{file.fileName}</b></p>
          <p>ผู้ใช้กลุ่มนี้จะเปิดคู่มือนี้ไม่ได้อีก ไฟล์เดิมยังเก็บไว้ในระบบ</p>
        </Modal>
      )}
    </div>
  );
}

export function ResultModal({ ok, message }: { ok: boolean; message: string }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <Modal tone={ok ? "ok" : "hi"} title={ok ? "เรียบร้อย" : "ทำรายการไม่สำเร็จ"} onClose={() => { setOpen(false); history.replaceState(null, "", "/admin/manuals"); }}>
      <p>{message}</p>
    </Modal>
  );
}
