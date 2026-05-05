import Anthropic from '@anthropic-ai/sdk';
import prisma from './db';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const MODEL = 'claude-3-5-sonnet-20241022';

const CHUNK_SIZE = 50;

const SYSTEM_PROMPT = `You are an expert product analyst. Extract insights from the reviews and return STRICT JSON ONLY. Do not use markdown backticks, no preamble, no conversational text. The JSON must follow this exact schema:
{
  "purchaseCriteria": [
    { "name": "string", "frequencyScore": "number (0-100)", "sentiment": "positive|negative|mixed", "quote": "string" }
  ],
  "complaints": [
    { "name": "string", "frequencyScore": "number", "quote": "string" }
  ],
  "strengths": ["string"],
  "sentiment": { "positive": "number", "neutral": "number", "negative": "number" },
  "gaps": ["string"]
}
Requirements:
- Complaints: up to 8 items
- Strengths: top 5
- Sentiment: positive, neutral, negative percentages MUST sum to 100.
`;

function chunkArray<T>(arr: T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
    arr.slice(i * size, i * size + size)
  );
}

async function getClaudeResponse(prompt: string): Promise<any> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.1,
    system: SYSTEM_PROMPT,
    messages: [
      { role: 'user', content: prompt }
    ]
  });

  const text = (response.content[0] as any).text.trim();
  try {
    return JSON.parse(text);
  } catch (e) {
    // If it wrapped in markdown
    const cleaned = text.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
  }
}

export async function analyseReviews(asin: string) {
  const reviews = await prisma.review.findMany({
    where: { listingAsin: asin },
    select: { rating: true, title: true, body: true }
  });

  if (!reviews || reviews.length === 0) {
    throw new Error(`No reviews found for ASIN ${asin}`);
  }

  const chunks = chunkArray(reviews, CHUNK_SIZE);
  const chunkResults = [];

  console.log(`[ASIN ${asin}] Analyzing ${reviews.length} reviews in ${chunks.length} batches of 50...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const reviewsText = chunk.map(r => `Rating: ${r.rating}\nTitle: ${r.title}\nBody: ${r.body}\n---`).join('\n');
    
    const prompt = `Analyze the following batch of product reviews and output JSON according to the system instructions:\n\n<reviews>\n${reviewsText}\n</reviews>`;
    
    try {
      console.log(`[ASIN ${asin}] Processing batch ${i + 1}/${chunks.length}...`);
      const result = await getClaudeResponse(prompt);
      chunkResults.push(result);
    } catch (error: any) {
      console.error(`[ASIN ${asin}] Error processing batch ${i + 1}:`, error.message);
    }
  }

  if (chunkResults.length === 0) {
    throw new Error(`Failed to analyze any batches for ASIN ${asin}`);
  }

  let finalResult;

  if (chunkResults.length === 1) {
    finalResult = chunkResults[0];
  } else {
    console.log(`[ASIN ${asin}] Aggregating ${chunkResults.length} batch results...`);
    const aggregatePrompt = `I have analyzed reviews for a product in batches. Below is the JSON output from each batch.
Aggregate them into a single final JSON matching the exact system schema.
Recalculate the overall sentiment breakdown (average out the percentages so they sum to 100).
Merge similar purchase criteria and complaints (combine their frequency scores intelligently).
Ensure complaints are max 8 items, strengths are exactly top 5.

<batches>
${JSON.stringify(chunkResults, null, 2)}
</batches>`;
    
    try {
      finalResult = await getClaudeResponse(aggregatePrompt);
    } catch (error: any) {
      console.error(`[ASIN ${asin}] Error during aggregation:`, error.message);
      throw new Error("Aggregation failed");
    }
  }

  // Save to DB
  const savedAnalysis = await prisma.analysisResult.upsert({
    where: { listingAsin: asin },
    update: {
      purchaseCriteria: JSON.stringify(finalResult.purchaseCriteria || []),
      complaints: JSON.stringify(finalResult.complaints || []),
      strengths: JSON.stringify(finalResult.strengths || []),
      sentiment: JSON.stringify(finalResult.sentiment || { positive: 0, neutral: 0, negative: 0 }),
      gaps: JSON.stringify(finalResult.gaps || []),
      analysedAt: new Date()
    },
    create: {
      listingAsin: asin,
      purchaseCriteria: JSON.stringify(finalResult.purchaseCriteria || []),
      complaints: JSON.stringify(finalResult.complaints || []),
      strengths: JSON.stringify(finalResult.strengths || []),
      sentiment: JSON.stringify(finalResult.sentiment || { positive: 0, neutral: 0, negative: 0 }),
      gaps: JSON.stringify(finalResult.gaps || []),
      analysedAt: new Date()
    }
  });

  console.log(`[ASIN ${asin}] Analysis complete and saved to DB.`);
  return { success: true, asin, data: finalResult };
}
