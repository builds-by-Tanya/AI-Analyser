import prisma from '@/lib/db';
import DashboardClient from '@/components/dashboard-client';
import ExportButton from '@/components/export-button';
import { estimateRevenue } from '@/lib/revenue';

export const revalidate = 0; // Disable caching to see fresh scrapes

export default async function DashboardPage() {
  // Fetch all listings with their analysis and review counts
  const listings = await prisma.listing.findMany({
    include: {
      analysis: true,
      _count: {
        select: { reviews: true }
      }
    },
    orderBy: {
      scrapedAt: 'desc'
    }
  });

  // Calculate global metrics
  const totalReviewsScraped = listings.reduce((sum, l) => sum + l._count.reviews, 0);
  const avgRating = listings.length > 0 
    ? listings.reduce((sum, l) => sum + (l.rating || 0), 0) / listings.length 
    : 0;

  // Enhance listings with revenue and parsed AI analysis
  const enhancedListings = listings.map(listing => {
    // Generate revenue estimations
    const revenueData = estimateRevenue(listing.bsr, listing.bsrCategory, listing.price);
    
    // Parse the JSON strings stored in the Analysis model
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
      } catch (e) {
        console.error(`[Dashboard] Failed to parse analysis for ${listing.asin}`, e);
      }
    }

    return {
      ...listing,
      revenueData,
      parsedAnalysis
    };
  });

  // Sort by revenue descending and LIMIT TO TOP 10
  enhancedListings.sort((a, b) => b.revenueData.estimatedMonthlyRevenue - a.revenueData.estimatedMonthlyRevenue);
  const top10Listings = enhancedListings.slice(0, 10);

  const marketSize = top10Listings.reduce((sum, l) => sum + l.revenueData.estimatedMonthlyRevenue, 0);

  // Find most common purchase criterion across all analyzed products
  const criteriaCounts: Record<string, number> = {};
  top10Listings.forEach(l => {
    if (l.parsedAnalysis?.purchaseCriteria) {
      l.parsedAnalysis.purchaseCriteria.forEach((c: any) => {
        const name = c.name.toLowerCase();
        criteriaCounts[name] = (criteriaCounts[name] || 0) + 1;
      });
    }
  });

  let mostCommonCriterion = "N/A";
  let maxCount = 0;
  for (const [name, count] of Object.entries(criteriaCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonCriterion = name;
    }
  }

  // Capitalize for display
  mostCommonCriterion = mostCommonCriterion !== "N/A" 
    ? mostCommonCriterion.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') 
    : "N/A";

  const metrics = {
    marketSize,
    avgRating,
    totalReviewsScraped,
    mostCommonCriterion,
    count: top10Listings.length
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Market Intelligence Dashboard</h1>
            <p className="text-slate-400 mt-2">AI-driven competitive landscape for your niche.</p>
          </div>
          <ExportButton />
        </div>
        
        {/* Pass processed data to the interactive client component */}
        <DashboardClient data={top10Listings} metrics={metrics} />
      </div>
    </div>
  );
}
