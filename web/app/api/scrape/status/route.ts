export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { jobStore } from '@/lib/job-store';

export async function GET() {
  const latest = await jobStore.getLatest();

  if (!latest) {
    return NextResponse.json({ isRunning: false, totalReviews: 0, currentAsin: null });
  }

  return NextResponse.json({
    isRunning: latest.isRunning,
    totalReviews: latest.totalReviews,
    currentAsin: latest.currentAsin,
    totalListings: latest.totalListings,
    completedAsins: latest.completedAsins,
  });
}
