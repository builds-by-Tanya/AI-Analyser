"""
scraper.py — Rainforest API wrapper for Amazon product + review data
"""

import os
import time
import json
import logging
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv()

RAINFOREST_API_KEY = os.getenv("RAINFOREST_API_KEY", "")
BASE_URL = "https://api.rainforestapi.com/request"
RAW_DIR = Path("data/raw")

logger = logging.getLogger(__name__)


def _request_with_retry(params: dict, max_retries: int = 3) -> dict:
    """GET Rainforest API with exponential backoff."""
    params["api_key"] = RAINFOREST_API_KEY
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.get(BASE_URL, params=params, timeout=30)
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            wait = 2 ** attempt
            logger.warning("Rainforest API attempt %d/%d failed: %s — retrying in %ds",
                           attempt, max_retries, exc, wait)
            if attempt == max_retries:
                raise
            time.sleep(wait)
    return {}


def fetch_product(asin: str) -> dict:
    """Fetch product metadata for an ASIN."""
    logger.info("Fetching product metadata for %s", asin)
    data = _request_with_retry({
        "type": "product",
        "asin": asin,
        "amazon_domain": "amazon.com",
    })
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = RAW_DIR / f"{asin}_product.json"
    raw_path.write_text(json.dumps(data, indent=2))
    return data


def parse_product(data: dict) -> dict:
    """Extract key fields from a product API response."""
    product = data.get("product", {})

    # BSR — may be nested
    bsr = None
    bsr_data = product.get("bestsellers_rank")
    if isinstance(bsr_data, list) and bsr_data:
        bsr = bsr_data[0].get("rank")
    elif isinstance(bsr_data, int):
        bsr = bsr_data

    # Price
    price = None
    buybox = product.get("buybox_winner", {})
    if buybox:
        price = buybox.get("price", {}).get("value")
    if price is None:
        price_obj = product.get("price", {})
        price = price_obj.get("value") if isinstance(price_obj, dict) else price_obj

    return {
        "title": product.get("title", ""),
        "brand": product.get("brand", ""),
        "price": float(price) if price else 0.0,
        "bsr": int(bsr) if bsr else 999_999,
        "rating": float(product.get("rating", 0)),
        "review_count": int(product.get("ratings_total", 0)),
    }


def fetch_reviews(asin: str, target: int = 1000) -> list[dict]:
    """
    Paginate Rainforest reviews endpoint until we have `target` reviews
    or exhaust the listing's total.
    """
    logger.info("Fetching reviews for %s (target=%d)", asin, target)
    all_reviews: list[dict] = []
    page = 1

    while len(all_reviews) < target:
        data = _request_with_retry({
            "type": "reviews",
            "asin": asin,
            "amazon_domain": "amazon.com",
            "page": page,
        })

        page_reviews = data.get("reviews", [])
        if not page_reviews:
            logger.info("No more reviews on page %d for %s — stopping.", page, asin)
            break

        all_reviews.extend(page_reviews)
        logger.info("  ASIN %s — page %d — collected %d reviews so far",
                    asin, page, len(all_reviews))

        # Save raw page
        raw_path = RAW_DIR / f"{asin}_reviews_p{page}.json"
        raw_path.write_text(json.dumps(data, indent=2))

        # Check if there are more pages
        pagination = data.get("pagination", {})
        total_pages = pagination.get("total_pages", 1)
        if page >= total_pages:
            break

        page += 1
        time.sleep(1)  # polite delay

    return all_reviews[:target]


def parse_reviews(raw_reviews: list[dict]) -> list[dict]:
    """Normalise raw review objects to a flat dict."""
    parsed = []
    for r in raw_reviews:
        parsed.append({
            "rating": r.get("rating", 0),
            "title": r.get("title", ""),
            "body": r.get("body", ""),
            "verified_purchase": r.get("verified_purchase", False),
            "date": r.get("date", {}).get("raw", "") if isinstance(r.get("date"), dict)
                    else str(r.get("date", "")),
        })
    return parsed
