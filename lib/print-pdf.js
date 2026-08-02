export function billPdfBaseName(billNumber, fallback = '000') {
  const billNum = String(billNumber || fallback).replace(/^leafandlife-/i, '') || fallback;
  return `leafandlife_bill_${billNum}`;
}

/**
 * Ensure document.title matches the PDF basename, then open print.
 * Mobile browsers snapshot the page title for Save as PDF; keep it set
 * (page <title> should already be this basename when a bill # exists).
 * Do not restore immediately on afterprint — iOS fires that when the
 * dialog opens, which would reset the suggested filename to "Order".
 */
export function printWithPdfTitle(pdfTitle) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  document.title = pdfTitle;

  window.setTimeout(() => {
    window.print();
  }, 50);
}
