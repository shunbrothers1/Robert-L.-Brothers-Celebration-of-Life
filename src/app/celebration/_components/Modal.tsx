"use client";

import { useEffect, useId, useRef } from "react";

/**
 * A bottom sheet on phones, a centered dialog on larger screens. Locks
 * page scroll while open, closes on Escape or a backdrop tap, and moves
 * focus into the dialog so screen readers land in the right place.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative max-h-[94dvh] w-full overflow-y-auto rounded-t-3xl bg-cream-50 shadow-2xl outline-none sm:max-w-lg sm:rounded-3xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-cream-300 bg-cream-50/95 px-5 py-4 backdrop-blur">
          <h2 id={titleId} className="font-display text-xl font-semibold text-charcoal">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-2xl leading-none text-stone-500 hover:bg-cream-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-5 pb-8 pt-5">{children}</div>
      </div>
    </div>
  );
}
