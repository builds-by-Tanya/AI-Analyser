"""
revenue.py — BSR-to-monthly-revenue estimation
"""

import math
import logging

logger = logging.getLogger(__name__)


def estimate_monthly_sales(bsr: int) -> int:
    """
    Jungle Scout approximation:
        monthly_sales ≈ exp(10.5 - 0.85 * ln(bsr))
    """
    if not bsr or bsr <= 0:
        return 0
    try:
        return round(math.exp(10.5 - 0.85 * math.log(bsr)))
    except (ValueError, OverflowError):
        return 0


def estimate_monthly_revenue(bsr: int, price: float) -> float:
    """Return estimated monthly revenue in USD."""
    sales = estimate_monthly_sales(bsr)
    return round(sales * price, 2)


def compute_all_revenue(listings: list[dict]) -> list[dict]:
    """
    Given a list of listing dicts (with 'asin', 'bsr', 'price'),
    return a list of revenue dicts.
    """
    results = []
    for listing in listings:
        asin = listing["asin"]
        bsr = listing.get("bsr") or 999_999
        price = listing.get("price") or 0.0

        sales = estimate_monthly_sales(bsr)
        revenue = estimate_monthly_revenue(bsr, price)

        logger.info("Revenue for %s: BSR=%d → ~%d sales/mo → $%.2f/mo",
                    asin, bsr, sales, revenue)
        results.append({
            "asin": asin,
            "est_monthly_sales": sales,
            "est_monthly_revenue": revenue,
        })
    return results
