"use client";
// Re-fetches the current page's server data every few seconds, so a new alert shows up in the
// hospital inbox without anyone pressing reload. router.refresh() keeps scroll and state.
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
