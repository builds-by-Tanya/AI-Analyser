"""
pipeline.py — Orchestrates all stages of the Review Analytics Pipeline.

Usage:
    python pipeline.py --asins B08N5WRWNW,B07XYZ1234,...
"""

import argparse
import logging
import sys
import time
from datetime import datetime

import db
import scraper
import revenue
import analyzer

# ── Logging setup ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("pipeline.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("pipeline")


def stage_banner(name: str):
    logger.info("=" * 60)
    logger.info("STAGE: %s  [%s]", name, datetime.now().strftime("%H:%M:%S"))
    logger.info("=" * 60)


# ── Stage 1: Scrape ───────────────────────────────────────────────────────────

def run_scrape(asins: list[str]):
    stage_banner("1 — Scrape listings & reviews")
    for asin in asins:
        logger.info("Processing ASIN: %s", asin)

        # Product metadata
        try:
            product_data = scraper.fetch_product(asin)
            meta = scraper.parse_product(product_data)
        except Exception as exc:
            logger.error("Failed to fetch product %s: %s", asin, exc)
            # Insert placeholder so pipeline can continue
            meta = {"title": asin, "brand": "", "price": 0.0,
                    "bsr": 999_999, "rating": 0.0, "review_count": 0}
            product_data = {}

        db.upsert_listing(
            asin=asin,
            title=meta["title"],
            brand=meta["brand"],
            price=meta["price"],
            bsr=meta["bsr"],
            rating=meta["rating"],
            review_count=meta["review_count"],
            raw=product_data,
        )
        logger.info("  Saved listing: %s — BSR=%s — $%.2f",
                    meta["title"][:60], meta["bsr"], meta["price"])

        # Reviews
        existing = db.count_reviews(asin)
        if existing >= 100:
            logger.info("  Already have %d reviews for %s — skipping scrape.", existing, asin)
            continue

        try:
            raw_reviews = scraper.fetch_reviews(asin, target=1000)
            parsed = scraper.parse_reviews(raw_reviews)
            if parsed:
                db.insert_reviews(asin, parsed)
                logger.info("  Saved %d reviews for %s", len(parsed), asin)
            else:
                logger.warning("  No reviews found for %s", asin)
        except Exception as exc:
            logger.error("Failed to fetch reviews for %s: %s", asin, exc)

        time.sleep(1)  # polite delay between ASINs


# ── Stage 2: Revenue ──────────────────────────────────────────────────────────

def run_revenue():
    stage_banner("2 — Revenue estimation")
    listings = db.get_all_listings()
    results = revenue.compute_all_revenue(listings)
    for r in results:
        db.upsert_revenue(r["asin"], r["est_monthly_sales"], r["est_monthly_revenue"])
    logger.info("Revenue estimates saved for %d listings.", len(results))


# ── Stage 3: Criteria extraction ──────────────────────────────────────────────

def run_criteria():
    stage_banner("3 — AI criteria extraction")
    all_reviews = db.get_all_reviews(limit=800)
    if not all_reviews:
        logger.error("No reviews in DB — cannot extract criteria. Run scrape first.")
        return

    criteria = analyzer.extract_all_criteria(all_reviews)
    db.set_criteria(criteria)
    logger.info("Stored final criteria: %s", criteria)


# ── Stage 4: Sentiment scoring ────────────────────────────────────────────────

def run_scoring(asins: list[str]):
    stage_banner("4 — AI sentiment scoring")
    criteria = db.get_criteria()
    if not criteria:
        logger.error("No criteria in DB — run criteria extraction first.")
        return

    asin_reviews: dict[str, list[dict]] = {}
    for asin in asins:
        asin_reviews[asin] = db.get_reviews_for_asin(asin, limit=200)

    all_scores = analyzer.score_all_asins(asin_reviews, criteria)
    for asin, scores in all_scores.items():
        for criterion, score in scores.items():
            db.upsert_score(asin, criterion, score)
    logger.info("Scores saved for %d ASINs × %d criteria.", len(all_scores), len(criteria))


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Review Analytics Pipeline")
    parser.add_argument(
        "--asins", required=True,
        help="Comma-separated list of ASINs (first = your listing, rest = competitors)"
    )
    parser.add_argument(
        "--skip-scrape", action="store_true",
        help="Skip scraping stage (use cached DB data)"
    )
    parser.add_argument(
        "--skip-ai", action="store_true",
        help="Skip AI stages (criteria + scoring)"
    )
    args = parser.parse_args()

    asins = [a.strip() for a in args.asins.split(",") if a.strip()]
    if len(asins) < 2:
        logger.error("Please provide at least 2 ASINs (1 yours + 1+ competitors).")
        sys.exit(1)
    if len(asins) > 10:
        logger.warning("More than 10 ASINs provided — using first 10.")
        asins = asins[:10]

    logger.info("Starting pipeline for %d ASINs: %s", len(asins), asins)
    start = time.time()

    db.init_db()

    if not args.skip_scrape:
        run_scrape(asins)
    else:
        logger.info("Skipping scrape stage (--skip-scrape).")

    run_revenue()

    if not args.skip_ai:
        run_criteria()
        run_scoring(asins)
    else:
        logger.info("Skipping AI stages (--skip-ai).")

    elapsed = time.time() - start
    logger.info("Pipeline complete in %.1fs.", elapsed)
    logger.info("Run: streamlit run app.py")


if __name__ == "__main__":
    main()
