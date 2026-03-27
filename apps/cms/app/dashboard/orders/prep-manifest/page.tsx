import { redirect } from "next/navigation";

import { getRotations } from "@/lib/actions/weekly-rotation.actions";

interface Props {
  searchParams: Promise<{ rotationId?: string }>;
}

/** @deprecated Use `/dashboard/prep` — kept for bookmarks and external links. */
export default async function LegacyPrepManifestRedirect({ searchParams }: Props) {
  const resolvedParams = await searchParams;

  if (resolvedParams.rotationId) {
    redirect(`/dashboard/prep?rotationId=${resolvedParams.rotationId}`);
  }

  const rotations = await getRotations();
  const first = rotations[0];
  if (first) {
    redirect(`/dashboard/prep?rotationId=${first.id}`);
  }

  redirect("/dashboard/prep");
}
