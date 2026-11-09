"use client";
export function PrintButton() {
  return (
    <button className="btn btn-small btn-primary" type="button" onClick={() => window.print()}>
      Print / save as PDF
    </button>
  );
}
