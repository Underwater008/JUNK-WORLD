import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewWorldPage() {
  redirect("/?view=projects&edit=1&world=__new_world__");
}
