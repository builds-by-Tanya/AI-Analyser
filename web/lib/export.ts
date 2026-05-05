export function generateListingsCsv(data: any[]): string {
  const headers = ['ASIN','Title','Brand','Price','BSR','Category','Rating','Review Count','Est. Monthly Sales','Est. Monthly Revenue'];
  const rows = data.map(item => [
    item.asin,
    '"' + (item.title  || '').replace(/"/g, '""') + '"',
    '"' + (item.brand  || '').replace(/"/g, '""') + '"',
    item.price       || '',
    item.bsr         || '',
    '"' + (item.bsrCategory || '').replace(/"/g, '""') + '"',
    item.rating      || '',
    item.reviewCount || '',
    item.revenueData?.estimatedMonthlySales  || 0,
    item.revenueData?.estimatedMonthlyRevenue || 0,
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function generateCriteriaCsv(data: any[]): string {
  const criteriaSet = new Set<string>();
  data.forEach(item =>
    (item.parsedAnalysis?.purchaseCriteria || []).forEach((c: any) => criteriaSet.add(c.name))
  );
  const criteria = Array.from(criteriaSet);
  const headers = ['Criterion', ...data.map(d => d.asin)];
  const rows = criteria.map(crit => {
    const row: (string | number)[] = ['"' + crit.replace(/"/g, '""') + '"'];
    data.forEach(item => {
      const found = (item.parsedAnalysis?.purchaseCriteria || []).find((c: any) => c.name === crit);
      row.push(found ? found.frequencyScore : 0);
    });
    return row;
  });
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function generateComplaintsCsv(data: any[]): string {
  const headers = ['ASIN','Complaint','Frequency Score','Quote'];
  const rows: (string | number)[][] = [];
  data.forEach(item => {
    (item.parsedAnalysis?.complaints || []).forEach((c: any) => {
      rows.push([
        item.asin,
        '"' + (c.name  || '').replace(/"/g, '""') + '"',
        c.frequencyScore || 0,
        '"' + (c.quote || '').replace(/"/g, '""') + '"',
      ]);
    });
  });
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function generateSentimentCsv(data: any[]): string {
  const headers = ['ASIN','Positive %','Neutral %','Negative %'];
  const rows = data.map(item => {
    const s = item.parsedAnalysis?.sentiment || { positive: 0, neutral: 0, negative: 0 };
    return [item.asin, s.positive, s.neutral, s.negative];
  });
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

export function generateFullCsv(data: any[]): string {
  return (
    '--- LISTINGS ---\n' + generateListingsCsv(data) +
    '\n\n--- PURCHASE CRITERIA HEATMAP ---\n' + generateCriteriaCsv(data) +
    '\n\n--- TOP COMPLAINTS ---\n' + generateComplaintsCsv(data) +
    '\n\n--- SENTIMENT BREAKDOWN ---\n' + generateSentimentCsv(data) + '\n'
  );
}
