'use client';

import Button from '@/components/ui/Button';
import { ExternalLink, Printer, X } from 'lucide-react';

interface ChallanPdfPreviewProps {
  open: boolean;
  pdfUrl: string | null;
  challanNumber: string;
  onClose: () => void;
  onPrint: () => void;
}

export default function ChallanPdfPreview({
  open,
  pdfUrl,
  challanNumber,
  onClose,
  onPrint,
}: ChallanPdfPreviewProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4">
      <div className="relative flex h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">PDF Preview</p>
            <h2 className="text-lg font-black text-stone-900 sm:text-xl">{challanNumber}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onPrint}>
              <Printer className="h-4 w-4" />
              Print PDF
            </Button>
            {pdfUrl ? (
              <a href={pdfUrl} target="_blank" rel="noreferrer">
                <Button type="button" variant="ghost">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              aria-label="Close PDF preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-stone-100">
          {pdfUrl ? (
            <iframe title={`${challanNumber} PDF preview`} src={pdfUrl} className="h-full w-full border-0" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-stone-500">Unable to load PDF preview.</div>
          )}
        </div>
      </div>
    </div>
  );
}
