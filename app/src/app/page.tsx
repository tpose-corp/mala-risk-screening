// "/" has no content of its own — send people to the patient list (which itself requires login).
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/patients");
}
