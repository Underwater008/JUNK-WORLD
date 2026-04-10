import HomeShell from "@/components/HomeShell";
import { isPortalWriteDisabled } from "@/lib/portal/mode";
import { hasPortalSession } from "@/lib/portal/session";
import { getHomepageUniversities } from "@/lib/projects/server";

export const dynamic = "force-dynamic";

function getFirstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const view = getFirstValue(resolvedSearchParams.view);
  const edit = getFirstValue(resolvedSearchParams.edit);
  const editorSessionAvailable = await hasPortalSession();
  const includeDrafts =
    view === "projects" && edit === "1" && editorSessionAvailable;
  const universities = await getHomepageUniversities({ includeDrafts });

  return (
    <HomeShell
      universities={universities}
      editorSessionAvailable={editorSessionAvailable}
      writesDisabled={isPortalWriteDisabled()}
    />
  );
}
