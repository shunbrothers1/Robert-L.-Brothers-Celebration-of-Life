import { notFound } from "next/navigation";
import EventSettingsForm from "./EventSettingsForm";
import { loadEventBundle } from "@/lib/celebration/admin-data";

export const metadata = { title: "Event Settings" };

export default async function SettingsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const bundle = await loadEventBundle(eventId);
  if (!bundle) notFound();
  return <EventSettingsForm event={bundle.event} settings={bundle.settings} />;
}
