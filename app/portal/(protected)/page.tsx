import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PortalDashboardPage() {
  redirect("/?view=projects&edit=1");
}
