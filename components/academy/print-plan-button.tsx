"use client"

export function PrintPlanButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7A6F63] transition-opacity hover:opacity-70 print:hidden"
    >
      Save as PDF
    </button>
  )
}
