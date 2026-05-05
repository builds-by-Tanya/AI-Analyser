export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { scrapeAmazonListing } from '@/lib/scraper';
import { analyseReviews } from '@/lib/nlp';
import { jobStore } from '@/lib/job-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { asins } = body;

    if (!asins || !Array.isArray(asins) || asins.length === 0) {
      return NextResponse.json({ error: 'Please provide an array of ASINs.' }, { status: 400 });
    }

    const jobId = Math.random().toString(36).substring(2, 15);

    // Initialise job state
    await jobStore.set(jobId, {
      isRunning: true,
      totalListings: asins.length,
      totalReviews: 0,
      currentAsin: asins[0],
      completedAsins: 0,
    });

    const runScrapingJob = async () => {
      console.log(`[Job ${jobId}] Started scraping ${asins.length} ASINs`);
      for (const asin of asins) {
        await jobStore.update(jobId, { currentAsin: asin });
        console.log(`[Job ${jobId}] Processing ASIN ${asin}...`);
        
        // Step 1: Scrape
        const result = await scrapeAmazonListing(asin);
        
        // Step 2: Analyse automatically if scrape succeeded
        if (result?.success) {
          console.log(`[Job ${jobId}] Scrape success for ${asin}. Starting AI analysis...`);
          await analyseReviews(asin).catch(e => console.error(`[Job ${jobId}] Analysis failed for ${asin}:`, e));
        }

        const prev = await jobStore.get(jobId);
        await jobStore.update(jobId, {
          totalReviews: (prev?.totalReviews ?? 0) + (result?.reviewsScraped ?? 0),
          completedAsins: (prev?.completedAsins ?? 0) + 1,
        });
      }
      await jobStore.update(jobId, { isRunning: false, currentAsin: null });
      console.log(`[Job ${jobId}] Finished.`);
    };

    runScrapingJob().catch(async err => {
      console.error(`[Job ${jobId}] Error:`, err);
      await jobStore.update(jobId, { isRunning: false, error: err.message });
    });

    return NextResponse.json({
      jobId,
      status: 'processing',
      message: `Scraping started for ${asins.length} ASINs.`,
    });

  } catch (error: any) {
    console.error('API /api/scrape error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
