import type { PublicMemorial } from "@/lib/celebration/types";

/** Optional "Celebrating [Name]" section — only rendered when the family turns it on. */
export default function MemorialSection({ personName, memorial }: { personName: string; memorial: PublicMemorial }) {
  const hasContent =
    memorial.photo_url || memorial.biography || memorial.favorite_quote || memorial.gallery_urls.length > 0;
  if (!hasContent) return null;

  return (
    <section className="mx-auto max-w-3xl px-4" aria-labelledby="memorial-title">
      <div className="m-card overflow-hidden">
        <div className="px-6 pb-8 pt-10 text-center">
          <p className="m-eyebrow">In Loving Memory</p>
          <h2 id="memorial-title" className="mt-2 font-display text-3xl font-semibold">
            Celebrating {personName}
          </h2>
          {memorial.photo_url && (
            /* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host */
            <img
              src={memorial.photo_url}
              alt={`${personName}`}
              loading="lazy"
              className="mx-auto mt-6 max-h-[420px] w-full max-w-md rounded-2xl object-cover"
            />
          )}
          {memorial.favorite_quote && (
            <blockquote className="mx-auto mt-8 max-w-xl font-display text-2xl italic leading-snug text-gold-700">
              &ldquo;{memorial.favorite_quote}&rdquo;
            </blockquote>
          )}
          {memorial.biography && (
            <div className="mx-auto mt-6 max-w-xl whitespace-pre-line text-left text-[17px] leading-relaxed text-stone-700">
              {memorial.biography}
            </div>
          )}
        </div>
        {memorial.gallery_urls.length > 0 && (
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {memorial.gallery_urls.map((url) => (
              /* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host */
              <img key={url} src={url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
