// The round logo on the login page. Still: it used to swell with each heartbeat, but that felt
// unsettling, so it only fades in with the rest of the page.
import type { ReactNode } from "react";

export function Emblem({ children }: { children: ReactNode }) {
  return (
    <div className="lg-emblem">
      <div className="core">{children}</div>
    </div>
  );
}
