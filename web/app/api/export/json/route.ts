export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { estimateRevenue } from '@/lib/revenue';

export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      include: { analysis: true }
    });

    const data = listings.map(listing => {
      const revenueData = estimateRevenue(listing.bsr, listing.bsrCategory, listing.price);
      let parsedAnalysis = null;
      if (listing.analysis) {
        try {
          parsedAnalysis = {
            purchaseCriteria: JSON.parse(listing.analysis.purchaseCriteria || '[]'),
            complaints: JSON.parse(listing.analysis.complaints || '[]'),
            strengths: JSON.parse(listing.analysis.strengths || '[]'),
            sentiment: JSON.parse(listing.analysis.sentiment || '{"positive": 0, "neutral": 0, "negative": 0}'),
            gaps: JSON.parse(listing.analysis.gaps || '[]'),
          };
        } catch (e) {}
      }
      return { ...listing, revenueData, analysis: parsedAnalysis };
    });

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="analysis_export.json"'
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
