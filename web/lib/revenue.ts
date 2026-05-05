import prisma from './db';

type BsrTable = Record<number, number>;

const BASE_TABLE: BsrTable = {
  100: 7200,
  500: 1800,
  1000: 1000,
  2500: 450,
  5000: 250,
  10000: 140,
  25000: 65,
  50000: 35,
  100000: 10
};

// Simulated Jungle Scout lookup tables for top 10 categories
const CATEGORY_TABLES: Record<string, BsrTable> = {
  "Electronics": { 100: 9000, 500: 2500, 1000: 1200, 2500: 600, 5000: 300, 10000: 180, 25000: 80, 50000: 40, 100000: 12 },
  "Home & Kitchen": { 100: 8500, 500: 2200, 1000: 1100, 2500: 550, 5000: 280, 10000: 150, 25000: 70, 50000: 35, 100000: 10 },
  "Sports & Outdoors": { 100: 6000, 500: 1500, 1000: 800, 2500: 350, 5000: 200, 10000: 100, 25000: 50, 50000: 25, 100000: 5 },
  "Beauty": { 100: 12000, 500: 3000, 1000: 1500, 2500: 800, 5000: 400, 10000: 220, 25000: 90, 50000: 45, 100000: 15 },
  "Toys & Games": { 100: 7500, 500: 1900, 1000: 950, 2500: 450, 5000: 250, 10000: 120, 25000: 55, 50000: 20, 100000: 5 },
  "Books": { 100: 4000, 500: 1000, 1000: 600, 2500: 250, 5000: 150, 10000: 80, 25000: 40, 50000: 20, 100000: 8 },
  "Clothing": { 100: 15000, 500: 4000, 1000: 2000, 2500: 1000, 5000: 500, 10000: 250, 25000: 100, 50000: 50, 100000: 20 },
  "Kitchen": { 100: 8000, 500: 2000, 1000: 1000, 2500: 500, 5000: 250, 10000: 130, 25000: 60, 50000: 30, 100000: 10 },
  "Pet Supplies": { 100: 6500, 500: 1600, 1000: 850, 2500: 400, 5000: 200, 10000: 110, 25000: 45, 50000: 20, 100000: 5 },
  "Tools & Home Improvement": { 100: 5000, 500: 1300, 1000: 700, 2500: 300, 5000: 150, 10000: 80, 25000: 35, 50000: 15, 100000: 5 }
};

function interpolateSales(bsr: number, table: BsrTable): number {
  const ranks = Object.keys(table).map(Number).sort((a, b) => a - b);
  
  if (bsr <= ranks[0]) return table[ranks[0]];
  if (bsr >= ranks[ranks.length - 1]) return Math.max(0, table[ranks[ranks.length - 1]] * Math.pow(ranks[ranks.length - 1] / bsr, 0.85)); // exponential decay tail
  
  for (let i = 0; i < ranks.length - 1; i++) {
    const lowerRank = ranks[i];
    const upperRank = ranks[i + 1];
    
    if (bsr >= lowerRank && bsr <= upperRank) {
      const lowerSales = table[lowerRank];
      const upperSales = table[upperRank];
      const ratio = (bsr - lowerRank) / (upperRank - lowerRank);
      return Math.round(lowerSales - ratio * (lowerSales - upperSales));
    }
  }
  return 0;
}

export function estimateRevenue(bsr: number | null, category: string | null, price: number | null) {
  if (!bsr || !price) {
    return {
      estimatedMonthlySales: 0,
      estimatedMonthlyRevenue: 0,
      confidenceRange: { low: 0, high: 0 },
      methodology: "Missing BSR or Price",
      isLowConfidence: true
    };
  }

  // Find table or fallback
  let table = BASE_TABLE;
  let usedCategory = "All Categories";
  
  if (category) {
    const matchingKey = Object.keys(CATEGORY_TABLES).find(k => category.toLowerCase().includes(k.toLowerCase()));
    if (matchingKey) {
      table = CATEGORY_TABLES[matchingKey];
      usedCategory = matchingKey;
    }
  }

  const estimatedMonthlySales = interpolateSales(bsr, table);
  const estimatedMonthlyRevenue = Math.round(estimatedMonthlySales * price);
  
  const low = Math.round(estimatedMonthlyRevenue * 0.7);
  const high = Math.round(estimatedMonthlyRevenue * 1.3);

  return {
    estimatedMonthlySales,
    estimatedMonthlyRevenue,
    confidenceRange: { low, high },
    methodology: `Interpolated using Jungle Scout approximations for ${usedCategory}`,
    isLowConfidence: bsr > 100000
  };
}

export function formatRevenue(revenueData: ReturnType<typeof estimateRevenue>) {
  const formatCur = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num);
  return {
    displayValue: `${formatCur(revenueData.estimatedMonthlyRevenue)}/mo`,
    displayRange: `${formatCur(revenueData.confidenceRange.low)} - ${formatCur(revenueData.confidenceRange.high)}`,
    ...revenueData
  };
}
