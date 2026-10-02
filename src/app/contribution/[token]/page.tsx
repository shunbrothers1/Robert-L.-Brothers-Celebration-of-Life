import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ManageContribution from "./ManageContribution";
import { loadContributionByToken } from "@/lib/celebration/load";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your Contribution",
  robots: { index: false, follow: false },
  // Never send this private link onward as a referrer.
  referrer: "no-referrer",
};

export default async function ContributionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const contribution = await loadContributionByToken(token);
  if (!contribution) notFound();
  return (
    <main className="m-page-public px-4 py-10">
      <ManageContribution token={token} initial={contribution} />
    </main>
  );
}
