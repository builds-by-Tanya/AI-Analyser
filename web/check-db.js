const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
  try {
    const listings = await p.listing.findMany({
      include: { 
        analysis: true,
        _count: { select: { reviews: true } }
      }
    });
    const reviewCount = await p.review.count();

    console.log('LISTINGS:', JSON.stringify(listings, null, 2));
    console.log('REVIEW COUNT:', reviewCount);
    
    console.log('ANALYSES SUMMARY:');
    listings.forEach(l => {
      console.log(`- ASIN: ${l.asin}`);
      console.log(`  Title: ${l.title}`);
      console.log(`  Reviews in DB: ${l._count.reviews}`);
      console.log(`  Has Analysis Table Entry: ${!!l.analysis}`);
      if (l.analysis) {
        console.log(`  Analysis result (first 100 chars): ${JSON.stringify(l.analysis).slice(0, 100)}...`);
      }
    });

  } catch (e) {
    console.error(e);
  } finally {
    await p.$disconnect();
  }
}

run();
