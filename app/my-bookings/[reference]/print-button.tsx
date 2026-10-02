'use client'
export function ReceiptPrintButton() { return <button onClick={() => window.print()} className="rounded-lg bg-[#2e342d] px-4 py-3 text-xs font-semibold uppercase tracking-[.13em] text-white print:hidden">Download / print PDF</button> }
