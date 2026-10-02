"use client";

export default function PrintButton() {
  return (
    <button type="button" className="m-admin-btn bg-navy-700 text-white hover:bg-navy-800" onClick={() => window.print()}>
      Print checklist
    </button>
  );
}
