export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { scrapeAmazonListing } from '@/lib/scraper';
import { analyseReviews } from '@/lib/nlp';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { asins } = body;

    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      return NextResponse.json({ error: 'Please provide an array of ASINs.' }, { status: 400 });
    }

    console.log(`[Scrape API] Started synchronous scraping for ${asins.length} ASINs`);
    
    for (const asin of asins) {
      console.log(`[Scrape API] Processing ASIN ${asin}...`);
      
      // Step 1: Scrape (calls Rainforest or falls back to local simulation)
      const result = await scrapeAmazonListing(asin);
      
      // Step 2: Analyse reviews (calls Claude or falls back to local simulation)
      if (result?.success) {
        console.log(`[Scrape API] Scrape success for ${asin}. Starting AI analysis...`);
        await analyseReviews(asin);
      } else {
        console.warn(`[Scrape API] Scrape failed for ${asin}: ${result?.error}`);
      }
    }

    console.log(`[Scrape API] Completed all ${asins.length} ASINs.`);

    return NextResponse.json({
      status: 'success',
      message: `Scraping and analysis completed for ${asins.length} ASINs.`,
    });

  } catch (error: any) {
    console.error('API /api/scrape error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
