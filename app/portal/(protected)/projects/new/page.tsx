import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
  redirect("/?view=projects&edit=1&project=__new__");
}
