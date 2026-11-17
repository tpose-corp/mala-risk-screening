"use client";
// "แสดงหน้าละ [20] คน" picker. Changing it keeps every other filter in the URL and goes back to page 1.
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PER_PAGE_CHOICES } from "@/lib/paging";



export function PerPage({ value, unit = "รายการ" }: { value: number; unit?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="ui-perpage">
      แสดงหน้าละ
      <select className="ui-select" value={value} onChange={(e) => {
        const u = new URLSearchParams(params.toString());
        u.set("per", e.target.value);
        u.delete("page");
        router.push(`${pathname}?${u}`, { scroll: false });
      }}>
        {PER_PAGE_CHOICES.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      {unit}
    </label>
  );
}
