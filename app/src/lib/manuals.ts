// Manuals: one PDF per group of users. Shared by the admin page, the reader page and the
// floating manuals button.
export const MANUAL_MAX_MB = 4; // Vercel caps one request at 4.5 MB

export const MANUAL_AUDIENCES = [
  { key: "pcu", label: "เจ้าหน้าที่ รพ.สต.", title: "คู่มือเจ้าหน้าที่ รพ.สต." },
  { key: "clinician", label: "แพทย์ / พยาบาล", title: "คู่มือแพทย์และพยาบาล" },
  { key: "admin", label: "ผู้ดูแลระบบ", title: "คู่มือผู้ดูแลระบบ" },
] as const;

// Which manuals a role may open: its own; the admin may open all. "all" is from older uploads.
export function audiencesFor(role: string): string[] {
  return role === "admin" ? ["all", "pcu", "clinician", "admin"] : ["all", role];
}

export const fmtSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
