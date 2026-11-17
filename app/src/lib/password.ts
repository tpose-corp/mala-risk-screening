// Password rules shared by "change my password" and the admin's "new account" form.
import { randomInt } from "node:crypto";

export function passwordProblem(pw: string): string | null {
  if (pw.length < 8) return "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "รหัสผ่านต้องมีทั้งตัวอักษรภาษาอังกฤษและตัวเลข";
  if (pw.length > 72) return "รหัสผ่านยาวเกินไป";
  return null;
}

// Temporary password the admin reads out or hands over; the user must change it at first login.
// No look-alike characters (0/O, 1/l/I).
export function temporaryPassword(): string {
  const letters = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (s: string) => s[randomInt(s.length)];
  return Array.from({ length: 4 }, () => pick(letters)).join("") + Array.from({ length: 4 }, () => pick(digits)).join("");
}
