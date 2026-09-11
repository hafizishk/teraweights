import { redirect } from "next/navigation";

/** You and Home are one screen now. Old links to Profile land there. */
export default function ProfileRedirect() {
  redirect("/app");
}
