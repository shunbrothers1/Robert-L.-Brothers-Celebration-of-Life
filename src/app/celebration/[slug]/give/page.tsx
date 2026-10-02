import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Flourish from "../../_components/Flourish";
import GiftMethods from "../../_components/GiftMethods";
import { loadPublicEvent } from "@/lib/celebration/load";
import { DEFAULT_GIVING_MESSAGE, DEFAULT_GIVING_TITLE, givingIsAvailable } from "@/lib/celebration/giving";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadPublicEvent(slug);
  const name = loaded?.data.event.person_name;
  return { title: name ? `Monetary Gifts — ${name}` : "Monetary Gifts", robots: { index: false, follow: false } };
}

/** The family's monetary gift options. Money goes directly to them; the site only shows the details. */
export default async function GivePage({ params }: Props) {
  const { slug } = await params;
  const loaded = await loadPublicEvent(slug);
  if (!loaded) notFound();
  const { event } = loaded.data;
  const giving = event.giving;
  if (!givingIsAvailable(giving)) notFound();

  return (
    <main className="m-page-public px-4 pb-16 pt-8">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <p className="m-eyebrow text-[11px] text-white">{event.event_name}</p>
          <p className="mt-1 font-display text-2xl font-semibold text-white">{event.person_name}</p>
          <Flourish className="mt-2" />
          <h1 className="mt-3 font-display text-3xl font-semibold text-gold-400">{giving.title || DEFAULT_GIVING_TITLE}</h1>
        </div>

        <div className="m-card mt-5 border-gold-400/80 bg-ivory p-5 text-center">
          <p className="whitespace-pre-line font-display text-[17px] leading-relaxed text-charcoal">
            {giving.message || DEFAULT_GIVING_MESSAGE}
          </p>
        </div>

        <div className="mt-6">
          <GiftMethods methods={giving.methods} />
        </div>

        <p className="mt-6 text-center text-[14px] text-white/70">
          Gifts go directly to the family. This site doesn&apos;t process or store any payment information.
        </p>

        <div className="mt-6 text-center">
          <Link href={`/celebration/${event.slug}#food-list`} className="m-btn-hero min-h-[56px] w-full px-6 font-display tracking-[0.05em] sm:w-auto">
            RETURN TO FOOD LIST
          </Link>
        </div>
      </div>
    </main>
  );
}
