import { notFound } from "next/navigation";
import ContributorManager from "./ContributorManager";
import { loadEventBundle } from "@/lib/celebration/admin-data";

export const metadata = { title: "Contributors" };

export default async function ContributorsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const bundle = await loadEventBundle(eventId);
  if (!bundle) notFound();
  return (
    <ContributorManager
      eventId={bundle.event.id}
      contributions={bundle.contributions}
      items={bundle.items}
      categories={bundle.categories}
    />
  );
}
