"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList, Legend, Cell
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Star, MessageSquareText, TrendingUp, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ScrapeOverlay, useScrapeJob } from "@/components/scrape-overlay";
import { AsinInputForm } from "@/components/asin-input-form";

export default function DashboardClient({ data, metrics }: { data: any[], metrics: any }) {
  const { status, startScrape, dismiss } = useScrapeJob();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatCur = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  // Section 1: Revenue Chart
  const revenueChartData = useMemo(() =>
    data.map(item => ({
      name: item.title ? item.title.substring(0, 30) + (item.title.length > 30 ? '…' : '') : item.asin,
      revenue: item.revenueData?.estimatedMonthlyRevenue || 0,
      bsr: item.bsr ? '#' + item.bsr.toLocaleString() : 'N/A',
      isUser: item.isUser,
      asin: item.asin,
    })), [data]);

  // Section 2: Heatmap
  const topCriteria = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(listing => {
      (listing.parsedAnalysis?.purchaseCriteria || []).forEach((c: any) => {
        map[c.name] = (map[c.name] || 0) + (parseInt(c.frequencyScore) || 0);
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
  }, [data]);

  const getHeatmapColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500/20 text-emerald-300";
    if (score >= 50) return "bg-emerald-500/10 text-emerald-200";
    if (score >= 30) return "bg-slate-700 text-slate-300";
    if (score > 0)   return "bg-rose-500/10 text-rose-300";
    return "bg-slate-800 text-slate-500";
  };

  // Section 3: Sentiment
  const sentimentData = useMemo(() =>
    data.map(item => {
      const s = item.parsedAnalysis?.sentiment || { positive: 0, neutral: 0, negative: 0 };
      return {
        name: item.title ? item.title.substring(0, 20) + (item.title.length > 20 ? '…' : '') : item.asin,
        Positive: parseFloat(s.positive) || 0,
        Neutral:  parseFloat(s.neutral)  || 0,
        Negative: parseFloat(s.negative) || 0,
        asin: item.asin,
      };
    }), [data]);

  // Section 4: Complaints
  const topComplaints = useMemo(() => {
    const map: Record<string, { totalFreq: number; worstAsin: string; worstTitle: string; maxFreq: number }> = {};
    data.forEach(listing => {
      (listing.parsedAnalysis?.complaints || []).forEach((c: any) => {
        const freq = parseInt(c.frequencyScore) || 0;
        if (!map[c.name]) map[c.name] = { totalFreq: 0, worstAsin: listing.asin, worstTitle: listing.title, maxFreq: 0 };
        map[c.name].totalFreq += freq;
        if (freq > map[c.name].maxFreq) {
          map[c.name].maxFreq = freq;
          map[c.name].worstAsin = listing.asin;
          map[c.name].worstTitle = listing.title;
        }
      });
    });
    return Object.entries(map).map(([name, info]) => ({ name, ...info }))
      .sort((a, b) => b.totalFreq - a.totalFreq).slice(0, 8);
  }, [data]);

  // Section 5: Gaps
  const opportunityGaps = useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach(listing => {
      (listing.parsedAnalysis?.gaps || []).forEach((g: string) => {
        map[g.toLowerCase()] = (map[g.toLowerCase()] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])
      .map(([gap, count]) => ({ gap, count })).slice(0, 8);
  }, [data]);

  if (!data || data.length === 0) {
    return (
      <>
        <ScrapeOverlay status={status} onDismiss={dismiss} />
        <div className="flex flex-col items-center gap-8 py-20">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">No listings yet</h2>
            <p className="text-slate-400">Add up to 10 ASINs and hit <strong className="text-emerald-400">Start Scraping</strong> to populate your dashboard.</p>
          </div>
          <div className="w-full max-w-md">
            <AsinInputForm onScrape={startScrape} isRunning={status.isRunning} />
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <ScrapeOverlay status={status} onDismiss={dismiss} />

      <AsinInputForm onScrape={startScrape} isRunning={status.isRunning} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Market Size', value: formatCur(metrics.marketSize), sub: 'Sum of monthly revenue across top 10', icon: <DollarSign className="h-4 w-4 text-emerald-400" /> },
          { label: 'Average Rating', value: metrics.avgRating.toFixed(1), sub: 'Across analyzed listings', icon: <Star className="h-4 w-4 text-amber-400" /> },
          { label: 'Total Reviews', value: metrics.totalReviewsScraped.toLocaleString(), sub: 'Analyzed by Pixii AI', icon: <MessageSquareText className="h-4 w-4 text-blue-400" /> },
          { label: 'Top Purchase Criterion', value: metrics.mostCommonCriterion, sub: 'Most frequently mentioned feature', icon: <TrendingUp className="h-4 w-4 text-purple-400" /> },
        ].map((m, i) => (
          <Card key={i} className="bg-slate-900 border-slate-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">{m.label}</CardTitle>
              {m.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white truncate" title={m.value}>{m.value}</div>
              <p className="text-xs text-slate-500 mt-1">{m.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Competitor Revenue Ranking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 w-full min-h-[384px]">
            {isMounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueChartData} layout="vertical" margin={{ top: 20, right: 80, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#94a3b8" tickFormatter={(v) => '$' + (v / 1000) + 'k'} />
                  <YAxis dataKey="name" type="category" width={160} stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: '#1e293b' }}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                    formatter={(value: any) => formatCur(Number(value))}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {revenueChartData.map((entry, i) => (
                      <Cell key={'cell-' + i} fill={entry.isUser ? '#10b981' : '#3b82f6'} />
                    ))}
                    <LabelList dataKey="bsr" position="right" fill="#94a3b8" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Sentiment Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full min-h-[288px]">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sentimentData} margin={{ top: 10, right: 10, left: 0, bottom: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" />
                    <YAxis stroke="#94a3b8" tickFormatter={(v) => v + '%'} />
                    <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }} />
                    <Legend wrapperStyle={{ paddingTop: '10px' }} />
                    <Bar dataKey="Positive" stackId="a" fill="#10b981" />
                    <Bar dataKey="Neutral" stackId="a" fill="#64748b" />
                    <Bar dataKey="Negative" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Top Market Complaints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {topComplaints.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-200 capitalize">{c.name}</span>
                    <Badge className="bg-rose-500/20 text-rose-300">Score: {c.totalFreq}</Badge>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center justify-between mt-0.5">
                    <span className="truncate pr-4">{(c.worstTitle || c.worstAsin)?.substring(0, 35)}</span>
                    <Link href={'/report/' + c.worstAsin} className="flex items-center text-blue-400 hover:text-blue-300 flex-shrink-0">
                      Details <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Opportunity Gaps</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {opportunityGaps.map((g, i) => (
                  <li key={i} className="flex justify-between items-center text-sm text-slate-300 capitalize">
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] shrink-0">{i + 1}</span>
                      {g.gap}
                    </span>
                    <span className="text-xs text-slate-500 shrink-0 ml-2">{g.count} listings</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Purchase Criteria Heatmap</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="w-48 text-slate-400">Criterion</TableHead>
                {data.map(listing => (
                  <TableHead key={listing.asin} className="text-center min-w-28">
                    <div className="flex flex-col items-center gap-1">
                      <span className={'text-xs font-semibold ' + (listing.isUser ? 'text-emerald-400' : 'text-slate-300')}>
                        {listing.asin}
                      </span>
                      <Link href={'/report/' + listing.asin} className="text-[10px] text-blue-400 hover:underline flex items-center">
                        View <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                      </Link>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCriteria.map((criterion, i) => (
                <TableRow key={i} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell className="font-medium text-slate-200 capitalize">{criterion}</TableCell>
                  {data.map(listing => {
                    const pc = listing.parsedAnalysis?.purchaseCriteria || [];
                    const found = pc.find((c: any) => c.name.toLowerCase() === criterion.toLowerCase());
                    const score = found ? parseInt(found.frequencyScore) : 0;
                    return (
                      <TableCell key={listing.asin} className="p-1 text-center">
                        <div className={'rounded p-2 text-xs font-medium ' + getHeatmapColor(score)}>
                          {score > 0 ? score : '–'}
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
