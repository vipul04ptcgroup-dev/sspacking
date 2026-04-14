'use client';

import { useEffect, useState } from 'react';
import { getAllQuotes } from '@/lib/firestore';
import type { QuoteRequest } from '@/types';
import { formatDate } from '@/lib/utils';
import { Spinner, EmptyState } from '@/components/ui';
import { MessageSquare } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  quoted: 'bg-purple-100 text-purple-700',
  closed: 'bg-green-100 text-green-700',
};

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<QuoteRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { getAllQuotes().then(q => { setQuotes(q); setLoading(false); }); }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black text-stone-900">Quote Requests</h1>
        <p className="text-stone-500 mt-1">{quotes.length} total requests</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : quotes.length === 0 ? (
        <EmptyState icon={<MessageSquare className="w-16 h-16" />} title="No quote requests yet" />
      ) : (
        <div className="space-y-4">
          {quotes.map(quote => (
            <div key={quote.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-stone-900">{quote.name}</h3>
                  <p className="text-sm text-stone-500">{quote.email} · {quote.phone}</p>
                  {quote.company && <p className="text-sm text-stone-500">{quote.company}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${STATUS_COLORS[quote.status]}`}>{quote.status}</span>
                  <span className="text-xs text-stone-400">{formatDate(quote.createdAt)}</span>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Product Interest</p>
                  <p className="text-stone-800">{quote.productInterest}</p>
                </div>
                <div className="bg-stone-50 rounded-xl p-3">
                  <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Quantity</p>
                  <p className="text-stone-800">{quote.quantity}</p>
                </div>
                {quote.message && (
                  <div className="bg-stone-50 rounded-xl p-3 sm:col-span-2">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Message</p>
                    <p className="text-stone-800">{quote.message}</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-2">
                <a href={`mailto:${quote.email}?subject=Re: Your Packaging Quote Request`} className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition">
                  Reply via Email →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
