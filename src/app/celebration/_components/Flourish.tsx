/** Gold scrollwork divider, echoing a printed funeral program. Decorative only. */
export default function Flourish({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 text-gold-500 ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold-400 sm:w-24" />
      <svg width="64" height="18" viewBox="0 0 64 18" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M2 9h12c4 0 5-5 9-5 3 0 4 3 2 4.5" />
        <path d="M62 9H50c-4 0-5-5-9-5-3 0-4 3-2 4.5" />
        <path d="M2 9h12c4 0 5 5 9 5 3 0 4-3 2-4.5" />
        <path d="M62 9H50c-4 0-5 5-9 5-3 0-4-3-2-4.5" />
        <path d="M32 2.5l4.5 6.5-4.5 6.5-4.5-6.5z" fill="currentColor" fillOpacity="0.25" />
        <circle cx="32" cy="9" r="1.3" fill="currentColor" />
      </svg>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold-400 sm:w-24" />
    </div>
  );
}
