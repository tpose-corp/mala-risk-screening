// "กลับ" links that remember the list you came from. Only same-site paths under the given
// prefixes are accepted, so a crafted ?back= cannot send anyone to another site.
export function safeBack(v: unknown, prefix: string | string[]): string {
  const ok = (Array.isArray(prefix) ? prefix : [prefix]).some((p) => typeof v === "string" && v.startsWith(p));
  return ok && typeof v === "string" && !v.startsWith("//") && !v.includes("\\") ? v : "";
}

// Add ?back=<from> to a link.
export function withBack(href: string, from: string): string {
  return `${href}${href.includes("?") ? "&" : "?"}back=${encodeURIComponent(from)}`;
}
