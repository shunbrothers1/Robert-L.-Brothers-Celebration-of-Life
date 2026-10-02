/**
 * Decoration behind the top of the guest page: a navy glow, gold sweeping
 * lines, and lily/blue-flower corners (public/art). If the family uploaded
 * their own background artwork, that's shown instead of the built-in
 * flowers, darkened so the white text stays readable. Purely decorative.
 */
export default function HeroArt({ artworkUrl }: { artworkUrl?: string | null }) {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_18%,_#1d3a6b_0%,_#0b1f3a_70%)]" />
      {/* Soft light-blue "painted" glows around the portrait; navy stays dominant. */}
      <div className="absolute left-[-18%] top-[6%] h-[300px] w-[70%] rounded-full bg-[radial-gradient(closest-side,_rgba(122,162,214,0.38),_rgba(122,162,214,0.12)_55%,_transparent)] blur-md" />
      <div className="absolute right-[-18%] top-[14%] h-[320px] w-[72%] rounded-full bg-[radial-gradient(closest-side,_rgba(140,178,226,0.32),_rgba(140,178,226,0.1)_55%,_transparent)] blur-md" />
      <div className="absolute left-[18%] top-[24%] h-[180px] w-[64%] rounded-full bg-[radial-gradient(closest-side,_rgba(176,204,238,0.18),_transparent)] blur-lg" />
      {artworkUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- admin-supplied URL from any host */}
          <img src={artworkUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(7,23,48,0.82)_0%,_rgba(11,31,58,0.7)_55%,_rgba(11,31,58,0.45)_100%)]" />
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- static decoration */}
          <img
            src="/art/floral-top-left.png"
            alt=""
            className="absolute left-0 top-0 w-[42%] max-w-[260px] opacity-95 [-webkit-mask-image:radial-gradient(ellipse_at_top_left,_#000_45%,_transparent_78%)] [mask-image:radial-gradient(ellipse_at_top_left,_#000_45%,_transparent_78%)]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- static decoration */}
          <img
            src="/art/floral-bottom-right.png"
            alt=""
            className="absolute bottom-0 right-0 w-[28%] max-w-[180px] opacity-95 [-webkit-mask-image:radial-gradient(ellipse_at_bottom_right,_#000_45%,_transparent_80%)] [mask-image:radial-gradient(ellipse_at_bottom_right,_#000_45%,_transparent_80%)]"
          />
        </>
      )}
      <svg className="absolute -right-8 top-0 h-[340px] w-[260px] text-gold-400 sm:w-[380px]" viewBox="0 0 260 340" fill="none" preserveAspectRatio="none">
        <path d="M40 0 C 150 40, 250 120, 262 330" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        <path d="M80 0 C 170 50, 250 150, 262 260" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </svg>
      <svg className="absolute -left-8 bottom-0 h-[170px] w-[260px] text-gold-400 sm:h-[240px] sm:w-[380px]" viewBox="0 0 260 300" fill="none" preserveAspectRatio="none">
        <path d="M-2 40 C 20 180, 110 270, 262 302" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" opacity="0.85" />
        <path d="M-2 110 C 30 210, 110 270, 200 302" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
      </svg>
    </div>
  );
}
