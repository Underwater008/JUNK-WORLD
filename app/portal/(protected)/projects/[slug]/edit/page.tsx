import { redirect } from "next/navigation";
import {
  getExperienceWorldBySlug,
  getWorldForProjectSlug,
} from "@/lib/worlds/server";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const world = await getExperienceWorldBySlug(slug, { includeDrafts: true });
  if (world) {
    redirect(`/?view=projects&edit=1&world=${encodeURIComponent(world.slug)}`);
  }

  const parentWorld = await getWorldForProjectSlug(slug, { includeDrafts: true });
  if (parentWorld) {
    redirect(
      `/?view=projects&edit=1&world=${encodeURIComponent(parentWorld.slug)}&project=${encodeURIComponent(slug)}`
    );
  }

  redirect(`/?view=projects&edit=1&project=${encodeURIComponent(slug)}`);
}
