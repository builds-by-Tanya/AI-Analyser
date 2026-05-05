export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { estimateRevenue, formatRevenue } from '@/lib/revenue';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let asins: string[] = [];

    if (body.asin) {
      asins = [body.asin];
    } else if (body.asins && Array.isArray(body.asins)) {
      asins = body.asins;
    } else {
      return NextResponse.json({ error: 'Please provide asin or asins array' }, { status: 400 });
    }

    const listings = await prisma.listing.findMany({
      where: { asin: { in: asins } },
      select: {
        asin: true,
        title: true,
        price: true,
        bsr: true,
        bsrCategory: true
      }
    });

    if (listings.length === 0) {
      return NextResponse.json({ error: 'No matching listings found in database' }, { status: 404 });
    }

    const results = listings.map(listing => {
      const revenueData = estimateRevenue(listing.bsr, listing.bsrCategory, listing.price);
      return {
        ...listing,
        ...formatRevenue(revenueData)
      };
    });

    // Sort by estimated revenue descending
    results.sort((a, b) => b.estimatedMonthlyRevenue - a.estimatedMonthlyRevenue);

    // Calculate market size
    const marketSize = results.reduce((sum, item) => sum + item.estimatedMonthlyRevenue, 0);

    return NextResponse.json({
      success: true,
      marketSize,
      formattedMarketSize: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(marketSize),
      data: results
    });

  } catch (error: any) {
    console.error('[API /api/revenue] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
