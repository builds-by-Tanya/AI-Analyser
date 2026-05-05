const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const asins = [
  'B0CX254F91', 'B09B2SB9Y6', 'B09H2PYV7W', 'B07212F13B', 'B08T6KTT1N', 
  'B07G2N57D2', 'B09JFQ8MJ5', 'B07HSKKFJB', 'B08R6CHQGD', 'B0794QR581', 
  'B08N5WRWNW', 'B00005N5PF'
];

const categories = ['Electronics', 'Home & Kitchen', 'Office Products', 'Toys & Games'];
const brands = ['Pixii AI', 'Lumina', 'CineBlast', 'ViewSonic', 'Anker', 'Nebula', 'Epson', 'BenQ', 'Samsung', 'LG', 'Sony', 'XGIMI'];

async function seed() {
  console.log('Seeding database with highly varied and realistic mock data...');

  // Clear existing data to avoid confusion
  await p.analysisResult.deleteMany({});
  await p.review.deleteMany({});
  await p.listing.deleteMany({});

  for (let i = 0; i < asins.length; i++) {
    const asin = asins[i];
    const isUser = i === 0; // First one is user listing
    const brand = brands[i % brands.length];
    const price = 150 + Math.random() * 800;
    const bsr = 500 + Math.floor(Math.random() * 15000);
    const rating = 3.8 + Math.random() * 1.2;
    const reviewCount = 50 + Math.floor(Math.random() * 5000);

    const listing = {
      asin,
      title: `${brand} ${asin.substring(0, 4)} Smart 4K Projector`,
      brand,
      price: parseFloat(price.toFixed(2)),
      bsr,
      bsrCategory: categories[Math.floor(Math.random() * categories.length)],
      rating: parseFloat(rating.toFixed(1)),
      reviewCount,
      isUser,
      url: `https://www.amazon.com/dp/${asin}`,
      bullets: JSON.stringify(['4K Ultra HD', 'Smart OS', 'Compact Design', 'Built-in Audio', 'WiFi & Bluetooth']),
      imageUrls: JSON.stringify(['https://images.unsplash.com/photo-1535016120720-40c646bebbdc?w=400']),
    };

    await p.listing.create({ data: listing });

    // Create Analysis Result with VARIED metrics
    const pos = 40 + Math.random() * 50;
    const neg = Math.random() * (100 - pos);
    const neu = 100 - pos - neg;

    await p.analysisResult.create({
      data: {
        listingAsin: asin,
        purchaseCriteria: JSON.stringify([
          { name: 'Image Quality', frequencyScore: 60 + Math.random() * 40, sentiment: Math.random() > 0.3 ? 'positive' : 'negative' },
          { name: 'Portability', frequencyScore: 40 + Math.random() * 60, sentiment: Math.random() > 0.2 ? 'positive' : 'mixed' },
          { name: 'Sound', frequencyScore: 30 + Math.random() * 50, sentiment: Math.random() > 0.5 ? 'positive' : 'negative' },
          { name: 'Brightness', frequencyScore: 50 + Math.random() * 50, sentiment: Math.random() > 0.4 ? 'positive' : 'neutral' },
          { name: 'Value for Money', frequencyScore: 20 + Math.random() * 80, sentiment: Math.random() > 0.3 ? 'positive' : 'mixed' }
        ]),
        complaints: JSON.stringify([
          { name: 'Fan Noise', frequencyScore: Math.floor(Math.random() * 30) },
          { name: 'UI Lag', frequencyScore: Math.floor(Math.random() * 20) }
        ]),
        strengths: JSON.stringify(['Brightness', 'Design', 'Connectivity', 'Colors', 'Size'].slice(0, 3 + Math.floor(Math.random() * 3))),
        sentiment: JSON.stringify({ 
          positive: Math.round(pos), 
          neutral: Math.round(neu), 
          negative: Math.round(neg) 
        }),
        gaps: JSON.stringify(['No carrying case', 'Short cable', 'Requires dark room'].slice(0, 1 + Math.floor(Math.random() * 2))),
      }
    });

    // Create a few reviews
    for (let j = 0; j < 3; j++) {
      await p.review.create({
        data: {
          listingAsin: asin,
          author: `Reviewer ${j}`,
          rating: Math.floor(rating),
          title: 'Pretty good!',
          body: 'I really like this product. It works as advertised and the quality is decent for the price.',
          verified: true,
        }
      });
    }
  }

  console.log('Seeding complete! 12 ASINs populated with unique data.');
}

seed().catch(console.error).finally(() => p.$disconnect());
