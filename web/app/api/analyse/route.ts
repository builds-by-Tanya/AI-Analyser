export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { analyseReviews } from '@/lib/nlp';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { asin } = body;

    if (!asin || typeof asin !== 'string') {
      return NextResponse.json({ error: 'Please provide a valid ASIN string.' }, { status: 400 });
    }

    console.log(`[API /api/analyse] Starting NLP analysis for ASIN: ${asin}`);
    
    // Await the analysis (this could take a while depending on the number of reviews)
    const result = await analyseReviews(asin);

    return NextResponse.json({ 
      status: 'success', 
      message: `Analysis complete for ASIN ${asin}`,
      data: result.data
    });

  } catch (error: any) {
    console.error('[API /api/analyse] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
