// "/" has no content of its own: send people to the home page of their role (or to login).
import { redirect } from "next/navigation";
import { getCurrentUser, homeOf } from "@/lib/session";

export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? homeOf(user.role) : "/login");
}
