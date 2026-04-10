import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function getProjectsEditRedirect(next: string | undefined) {
  if (!next) return "/?view=projects&edit=1";

  const projectMatch = next.match(/^\/portal\/projects\/([^/]+)\/edit$/);
  if (projectMatch?.[1]) {
    return `/?view=projects&edit=1&project=${encodeURIComponent(projectMatch[1])}`;
  }

  if (next === "/portal/projects/new") {
    return "/?view=projects&edit=1&project=__new__";
  }

  return "/?view=projects&edit=1";
}

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(getProjectsEditRedirect(next));
}
