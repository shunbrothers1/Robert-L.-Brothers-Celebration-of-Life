"use client";

export default function PrintButton() {
  return (
    <button type="button" className="m-admin-btn bg-sage-700 text-white hover:bg-sage-800" onClick={() => window.print()}>
      Print checklist
    </button>
  );
}
