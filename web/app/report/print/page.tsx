import prisma from '@/lib/db';
import { estimateRevenue, formatRevenue } from '@/lib/revenue';
import PrintClient from './client';

export const revalidate = 0;

export default async function PrintReportPage() {
  const listings = await prisma.listing.findMany({
    include: { analysis: true }
  });

  const data = listings.map(listing => {
    const revenueData = estimateRevenue(listing.bsr, listing.bsrCategory, listing.price);
    let parsedAnalysis = null;
    if (listing.analysis) {
      try {
        parsedAnalysis = {
          purchaseCriteria: JSON.parse(listing.analysis.purchaseCriteria || '[]').slice(0, 5),
          complaints: JSON.parse(listing.analysis.complaints || '[]').slice(0, 5),
          strengths: JSON.parse(listing.analysis.strengths || '[]'),
          sentiment: JSON.parse(listing.analysis.sentiment || '{"positive": 0, "neutral": 0, "negative": 0}'),
          gaps: JSON.parse(listing.analysis.gaps || '[]'),
        };
      } catch (e) {}
    }
    return { ...listing, revenueData: formatRevenue(revenueData), analysis: parsedAnalysis };
  });

  data.sort((a, b) => b.revenueData.estimatedMonthlyRevenue - a.revenueData.estimatedMonthlyRevenue);

  const marketSize = data.reduce((sum, item) => sum + item.revenueData.estimatedMonthlyRevenue, 0);
  const avgRating = data.length > 0 ? data.reduce((sum, item) => sum + (item.rating || 0), 0) / data.length : 0;

  return <PrintClient data={data} marketSize={marketSize} avgRating={avgRating} />;
}
