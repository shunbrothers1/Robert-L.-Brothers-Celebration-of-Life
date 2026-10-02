import { notFound } from "next/navigation";
import MenuManager from "./MenuManager";
import { loadEventBundle } from "@/lib/celebration/admin-data";

export const metadata = { title: "Food List" };

export default async function MenuPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const bundle = await loadEventBundle(eventId);
  if (!bundle) notFound();
  return <MenuManager eventId={bundle.event.id} categories={bundle.categories} items={bundle.items} />;
}
