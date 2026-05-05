export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { estimateRevenue } from '@/lib/revenue';
import {
  generateListingsCsv,
  generateCriteriaCsv,
  generateComplaintsCsv,
  generateSentimentCsv,
  generateFullCsv,
} from '@/lib/export';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'full';

  try {
    const listings = await prisma.listing.findMany({ include: { analysis: true } });

    const data = listings.map(listing => {
      const revenueData = estimateRevenue(listing.bsr, listing.bsrCategory, listing.price);
      let parsedAnalysis = null;
      if (listing.analysis) {
        try {
          parsedAnalysis = {
            purchaseCriteria: JSON.parse(listing.analysis.purchaseCriteria || '[]'),
            complaints:       JSON.parse(listing.analysis.complaints       || '[]'),
            sentiment:        JSON.parse(listing.analysis.sentiment        || '{"positive":0,"neutral":0,"negative":0}'),
          };
        } catch {}
      }
      return { ...listing, revenueData, parsedAnalysis };
    });

    let csv = '';
    let filename = 'export.csv';

    switch (type) {
      case 'listings':   csv = generateListingsCsv(data);   filename = 'listings.csv';           break;
      case 'criteria':   csv = generateCriteriaCsv(data);   filename = 'purchase_criteria.csv';  break;
      case 'complaints': csv = generateComplaintsCsv(data); filename = 'complaints.csv';          break;
      case 'sentiment':  csv = generateSentimentCsv(data);  filename = 'sentiment.csv';           break;
      default:           csv = generateFullCsv(data);       filename = 'full_report.csv';         break;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
