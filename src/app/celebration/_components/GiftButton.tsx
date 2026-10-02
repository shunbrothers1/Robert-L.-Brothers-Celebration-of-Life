/** "Make a Monetary Gift" — the second way to help, linking to the gifts page. */
export default function GiftButton({ slug, className = "" }: { slug: string; className?: string }) {
  return (
    <a
      href={`/celebration/${slug}/give`}
      className={`m-btn min-h-[48px] w-full whitespace-nowrap border border-gold-400/70 bg-white/5 px-5 font-display text-[16px] tracking-[0.05em] text-white hover:bg-white/10 sm:w-auto sm:px-10 sm:text-[17px] ${className}`}
    >
      <svg width="20" height="18" viewBox="0 0 24 22" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-gold-400" aria-hidden="true">
        <path d="M12 20s-8-5.1-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 5.9-8 11-8 11z" strokeLinejoin="round" />
      </svg>
      <span className="h-5 w-px shrink-0 bg-gold-400/50" aria-hidden="true" />
      MAKE A MONETARY GIFT
    </a>
  );
}
