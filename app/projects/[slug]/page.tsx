import { notFound, redirect } from "next/navigation";
import {
  getPublishedWorldBySlug,
  getWorldForProjectSlug,
} from "@/lib/worlds/server";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const world = await getPublishedWorldBySlug(slug);
  if (world) {
    redirect(`/?view=projects&world=${encodeURIComponent(world.slug)}`);
  }

  const parentWorld = await getWorldForProjectSlug(slug, { includeDrafts: false });
  if (parentWorld) {
    redirect(
      `/?view=projects&world=${encodeURIComponent(parentWorld.slug)}&project=${encodeURIComponent(slug)}`
    );
  }

  notFound();
}
