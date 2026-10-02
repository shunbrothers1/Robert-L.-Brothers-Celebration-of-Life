import { notFound } from "next/navigation";
import SuggestionReview from "./SuggestionReview";
import { loadEventBundle } from "@/lib/celebration/admin-data";

export const metadata = { title: "Suggestions" };

export default async function SuggestionsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const bundle = await loadEventBundle(eventId);
  if (!bundle) notFound();
  return <SuggestionReview suggestions={bundle.suggestions} categories={bundle.categories} />;
}
