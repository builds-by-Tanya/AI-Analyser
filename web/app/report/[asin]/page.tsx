import prisma from '@/lib/db';
import { estimateRevenue, formatRevenue } from '@/lib/revenue';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Printer, Star, TrendingUp, AlertCircle, ThumbsUp } from 'lucide-react';
import ExportButton from '@/components/export-button';

export const revalidate = 0;

interface Props { params: Promise<{ asin: string }> }

export default async function ReportPage({ params }: Props) {
  const { asin } = await params;

  const listing = await prisma.listing.findUnique({
    where: { asin },
    include: {
      analysis: true,
      _count: { select: { reviews: true } }
    }
  });

  if (!listing) return notFound();

  const revenueData = formatRevenue(estimateRevenue(listing.bsr, listing.bsrCategory, listing.price));

  let parsedAnalysis: any = null;
  if (listing.analysis) {
    try {
      parsedAnalysis = {
        purchaseCriteria: JSON.parse(listing.analysis.purchaseCriteria || '[]'),
        complaints: JSON.parse(listing.analysis.complaints || '[]'),
        strengths: JSON.parse(listing.analysis.strengths || '[]'),
        sentiment: JSON.parse(listing.analysis.sentiment || '{"positive": 0, "neutral": 0, "negative": 0}'),
        gaps: JSON.parse(listing.analysis.gaps || '[]'),
      };
    } catch {}
  }

  const sentColor = (val: number) =>
    val >= 60 ? 'text-emerald-400' : val >= 30 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/dashboard" className="inline-flex items-center text-slate-400 hover:text-slate-200 text-sm mb-4 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-white leading-snug">{listing.title || 'Untitled Listing'}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className="bg-slate-700 text-slate-200">{asin}</Badge>
              {listing.brand && <Badge className="bg-slate-700 text-slate-200">{listing.brand}</Badge>}
              {listing.isUser && <Badge className="bg-emerald-600 text-white">Your Listing</Badge>}
              {revenueData.isLowConfidence && <Badge className="bg-amber-600 text-white">Low Confidence</Badge>}
            </div>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link href="/report/print" target="_blank" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 transition-colors">
              <Printer className="w-4 h-4" /> Print Report
            </Link>
            <ExportButton />
          </div>
        </div>

        {/* Metrics Row */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { label: 'Est. Monthly Revenue', value: revenueData.displayValue, sub: revenueData.displayRange, color: 'text-emerald-400' },
            { label: 'Amazon BSR', value: listing.bsr ? `#${listing.bsr.toLocaleString()}` : 'N/A', sub: listing.bsrCategory || '', color: 'text-blue-400' },
            { label: 'Star Rating', value: listing.rating ? `${listing.rating} ★` : 'N/A', sub: `${listing._count.reviews.toLocaleString()} reviews scraped`, color: 'text-amber-400' },
            { label: 'Price', value: listing.price ? `$${listing.price}` : 'N/A', sub: 'Current list price', color: 'text-purple-400' },
          ].map((m, i) => (
            <Card key={i} className="bg-slate-900 border-slate-800">
              <CardContent className="pt-4">
                <p className="text-xs text-slate-500 uppercase tracking-widest">{m.label}</p>
                <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
                <p className="text-xs text-slate-500 mt-1 truncate">{m.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Analysis Content */}
        {parsedAnalysis ? (
          <div className="grid gap-6 md:grid-cols-2">

            {/* Purchase Criteria */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-400" /> Purchase Criteria
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(parsedAnalysis.purchaseCriteria || []).map((c: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-200 capitalize">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${c.sentiment === 'positive' ? 'bg-emerald-900 text-emerald-300' : c.sentiment === 'negative' ? 'bg-rose-900 text-rose-300' : 'bg-amber-900 text-amber-300'}`}>{c.sentiment}</span>
                        <span className="text-sm font-bold text-slate-300">{c.frequencyScore}/100</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${c.frequencyScore}%` }} />
                    </div>
                    {c.quote && <p className="text-xs text-slate-500 italic">"{c.quote}"</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Complaints */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-400" /> Top Complaints
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(parsedAnalysis.complaints || []).map((c: any, i: number) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-200 capitalize">{c.name}</span>
                      <span className="text-sm font-bold text-rose-400">{c.frequencyScore}/100</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: `${c.frequencyScore}%` }} />
                    </div>
                    {c.quote && <p className="text-xs text-slate-500 italic">"{c.quote}"</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Sentiment + Strengths */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-400" /> Sentiment Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex h-10 w-full rounded overflow-hidden gap-0.5">
                  <div style={{ width: `${parsedAnalysis.sentiment?.positive || 0}%` }} className="bg-emerald-500 flex items-center justify-center text-white text-xs font-bold rounded-l">{parsedAnalysis.sentiment?.positive}%</div>
                  <div style={{ width: `${parsedAnalysis.sentiment?.neutral || 0}%` }} className="bg-slate-500 flex items-center justify-center text-white text-xs font-bold">{parsedAnalysis.sentiment?.neutral}%</div>
                  <div style={{ width: `${parsedAnalysis.sentiment?.negative || 0}%` }} className="bg-rose-500 flex items-center justify-center text-white text-xs font-bold rounded-r">{parsedAnalysis.sentiment?.negative}%</div>
                </div>
                <div className="flex gap-6 text-sm">
                  <span><span className={`font-bold ${sentColor(parsedAnalysis.sentiment?.positive)}`}>{parsedAnalysis.sentiment?.positive}%</span> <span className="text-slate-400">Positive</span></span>
                  <span><span className="font-bold text-slate-400">{parsedAnalysis.sentiment?.neutral}%</span> <span className="text-slate-400">Neutral</span></span>
                  <span><span className={`font-bold ${sentColor(100 - parsedAnalysis.sentiment?.negative)}`}>{parsedAnalysis.sentiment?.negative}%</span> <span className="text-slate-400">Negative</span></span>
                </div>
              </CardContent>
            </Card>

            {/* Strengths */}
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-emerald-400" /> What Customers Love
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {(parsedAnalysis.strengths || []).map((s: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-emerald-400 font-bold mt-0.5">✓</span> {s}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Opportunity Gaps */}
            <Card className="bg-slate-900 border-slate-800 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-white">Opportunity Gaps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {(parsedAnalysis.gaps || []).map((g: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-indigo-900/20 border border-indigo-800/30 text-sm text-indigo-200">
                      <span className="font-bold text-indigo-400 mt-0.5">→</span> {g}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

          </div>
        ) : (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="py-12 text-center text-slate-400">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-600" />
              <p className="text-lg font-medium">No analysis yet</p>
              <p className="text-sm mt-2">Run the analysis pipeline for ASIN <code className="text-blue-400">{asin}</code> to see insights here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
