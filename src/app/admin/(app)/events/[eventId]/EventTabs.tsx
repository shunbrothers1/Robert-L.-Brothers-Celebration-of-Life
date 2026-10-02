"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function EventTabs({ eventId, pendingSuggestions }: { eventId: string; pendingSuggestions: number }) {
  const pathname = usePathname();
  const base = `/admin/events/${eventId}`;
  const tabs = [
    { href: base, label: "Overview" },
    { href: `${base}/menu`, label: "Food List" },
    { href: `${base}/contributors`, label: "Contributors" },
    { href: `${base}/suggestions`, label: "Suggestions", badge: pendingSuggestions },
    { href: `${base}/settings`, label: "Event Settings" },
    { href: `${base}/print`, label: "Print" },
  ];
  return (
    <nav className="-mx-4 overflow-x-auto border-b border-cream-300 px-4 print:hidden" aria-label="Event sections">
      <div className="flex gap-1">
        {tabs.map((t) => {
          const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold ${active ? "border-sage-700 text-sage-800" : "border-transparent text-stone-600 hover:text-charcoal"}`}
            >
              {t.label}
              {t.badge ? (
                <span className="rounded-full bg-gold-700 px-2 py-0.5 text-xs font-bold text-white">{t.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
