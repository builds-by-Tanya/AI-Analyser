"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';

const printStyles = `
  @media print {
    .page-break-after-always { page-break-after: always; break-after: page; }
    .print-hidden { display: none; }
  }
`;

export default function PrintClient({ data, marketSize, avgRating }: { data: any[], marketSize: number, avgRating: number }) {
  const formatCur = (num: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />

      {/* Toolbar (hidden during print) */}
      <div className="print-hidden fixed top-4 right-4 z-50">
        <Button
          onClick={() => window.print()}
          className="shadow-lg flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800"
        >
          <Printer className="w-4 h-4" /> Print Report to PDF
        </Button>
      </div>

      {/* COVER PAGE */}
      <div className="w-full h-screen flex flex-col items-center justify-center border-b-2 border-slate-200 page-break-after-always">
        <h1 className="text-5xl font-bold mb-4">Amazon Review Analytics</h1>
        <h2 className="text-3xl text-slate-500 mb-12">Market Deep Dive Report</h2>
        <div className="grid grid-cols-2 gap-8 text-center mt-12 w-3/4 max-w-2xl">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-2">Total Est. Market Size</p>
            <p className="text-4xl font-bold text-slate-900">{formatCur(marketSize)}</p>
          </div>
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-2">Avg Market Rating</p>
            <p className="text-4xl font-bold text-slate-900">{avgRating.toFixed(1)} / 5.0</p>
          </div>
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg col-span-2">
            <p className="text-sm text-slate-500 uppercase tracking-widest font-semibold mb-2">Date Generated</p>
            <p className="text-2xl font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* LISTING PAGES */}
      {data.map((item, index) => (
        <div key={item.asin} className="w-full min-h-screen p-12 page-break-after-always">
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
            <div>
              <h3 className="text-3xl font-bold">{item.title}</h3>
              <p className="text-xl text-slate-600 mt-2">
                ASIN: {item.asin}
                {item.brand ? ' • Brand: ' + item.brand : ''}
                {item.isUser ? ' • (YOUR LISTING)' : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black text-emerald-600">{item.revenueData.displayValue}</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mt-1">Est. Monthly Revenue</p>
              <p className="text-sm text-slate-400 mt-1">
                BSR: #{item.bsr?.toLocaleString()} in {item.bsrCategory}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12">
            <div>
              <h4 className="text-xl font-bold uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-2 mb-4">
                Top 5 Purchase Criteria
              </h4>
              <ul className="space-y-4">
                {(item.analysis?.purchaseCriteria || []).map((c: any, i: number) => (
                  <li key={i} className="bg-slate-50 p-4 rounded-md border border-slate-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-lg capitalize">{c.name}</span>
                      <span className={
                        'text-sm font-bold px-2 py-1 rounded ' +
                        (c.sentiment === 'positive'
                          ? 'bg-emerald-100 text-emerald-700'
                          : c.sentiment === 'negative'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700')
                      }>
                        {c.frequencyScore}/100
                      </span>
                    </div>
                    {c.quote && <p className="text-sm text-slate-600 italic">&ldquo;{c.quote}&rdquo;</p>}
                  </li>
                ))}
              </ul>

              <h4 className="text-xl font-bold uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-2 mt-8 mb-4">
                Sentiment Breakdown
              </h4>
              <div className="flex h-8 w-full rounded overflow-hidden">
                <div
                  style={{ width: (item.analysis?.sentiment?.positive || 0) + '%' }}
                  className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold"
                >
                  {item.analysis?.sentiment?.positive}%
                </div>
                <div
                  style={{ width: (item.analysis?.sentiment?.neutral || 0) + '%' }}
                  className="bg-slate-400 flex items-center justify-center text-white text-xs font-bold"
                >
                  {item.analysis?.sentiment?.neutral}%
                </div>
                <div
                  style={{ width: (item.analysis?.sentiment?.negative || 0) + '%' }}
                  className="bg-rose-500 flex items-center justify-center text-white text-xs font-bold"
                >
                  {item.analysis?.sentiment?.negative}%
                </div>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2 font-semibold">
                <span>Positive</span><span>Neutral</span><span>Negative</span>
              </div>
            </div>

            <div>
              <h4 className="text-xl font-bold uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-2 mb-4">
                Top 5 Complaints
              </h4>
              <ul className="space-y-4">
                {(item.analysis?.complaints || []).map((c: any, i: number) => (
                  <li key={i} className="bg-rose-50 p-4 rounded-md border border-rose-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-rose-900 capitalize">{c.name}</span>
                      <span className="text-xs font-bold px-2 py-1 bg-rose-200 text-rose-800 rounded">
                        Score: {c.frequencyScore}
                      </span>
                    </div>
                    {c.quote && <p className="text-sm text-rose-700 italic">&ldquo;{c.quote}&rdquo;</p>}
                  </li>
                ))}
              </ul>

              <h4 className="text-xl font-bold uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-2 mt-8 mb-4">
                Key Strengths
              </h4>
              <ul className="list-disc pl-5 space-y-2">
                {(item.analysis?.strengths || []).map((s: string, i: number) => (
                  <li key={i} className="text-slate-700">{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-slate-400 border-t pt-4">
            Page {index + 2} • Amazon Review Analytics Report
          </div>
        </div>
      ))}
    </div>
  );
}
