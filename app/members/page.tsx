import { redirect } from "next/navigation";

export default function MembersPage() {
  redirect("/?view=members");
}
