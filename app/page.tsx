import HomeShell from "@/components/HomeShell";
import { getMembers } from "@/lib/members";
import { isPortalWriteDisabled } from "@/lib/portal/mode";
import { hasPortalSession } from "@/lib/portal/session";
import { getHomepageUniversities } from "@/lib/projects/server";
import { getBaseUniversities } from "@/lib/universities";

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
  const [universities, baseUniversities, members] = await Promise.all([
    getHomepageUniversities({ includeDrafts }),
    getBaseUniversities(),
    getMembers(),
  ]);

  return (
    <HomeShell
      universities={universities}
      baseUniversities={baseUniversities}
      members={members}
      editorSessionAvailable={editorSessionAvailable}
      writesDisabled={isPortalWriteDisabled()}
    />
  );
}
