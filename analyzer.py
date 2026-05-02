"""
analyzer.py — Claude API wrapper for criteria extraction and sentiment scoring
"""

import os
import json
import time
import logging
from typing import Any

import anthropic
from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODEL = "claude-sonnet-4-20250514"
BATCH_SIZE_CRITERIA = 80   # reviews per batch for criteria extraction
BATCH_SIZE_SCORING = 200   # reviews per ASIN for scoring

logger = logging.getLogger(__name__)
_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    return _client


def _call_claude(prompt: str, max_tokens: int = 1024, max_retries: int = 3) -> str:
    """Call Claude with retry/backoff. Returns raw text response."""
    client = _get_client()
    for attempt in range(1, max_retries + 1):
        try:
            message = client.messages.create(
                model=MODEL,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
            return message.content[0].text
        except anthropic.APIError as exc:
            wait = 2 ** attempt
            logger.warning("Claude API attempt %d/%d failed: %s — retrying in %ds",
                           attempt, max_retries, exc, wait)
            if attempt == max_retries:
                raise
            time.sleep(wait)
    return ""


def _safe_parse_json(text: str) -> Any:
    """Strip markdown fences and parse JSON."""
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1]) if len(lines) > 2 else text
    return json.loads(text)


# ── Criteria Extraction ───────────────────────────────────────────────────────

def _format_reviews_for_prompt(reviews: list[dict]) -> str:
    parts = []
    for i, r in enumerate(reviews, 1):
        title = r.get("title", "").strip()
        body = r.get("body", "").strip()
        rating = r.get("rating", "?")
        parts.append(f"[{i}] ★{rating} — {title}. {body}")
    return "\n".join(parts)


def extract_criteria_batch(reviews: list[dict]) -> list[str]:
    """Extract 6 purchase criteria from a batch of reviews."""
    reviews_text = _format_reviews_for_prompt(reviews)
    prompt = f"""You are an Amazon product research analyst. Below are customer reviews for a product category.

Identify the 6 most important purchase criteria that customers use to evaluate products in this category.
Return ONLY a JSON array of 6 strings. Each string should be a short label (3-5 words) using the exact 
language customers use. Do not use generic labels like "quality" or "value".

Reviews:
{reviews_text}

Return format: ["criterion 1", "criterion 2", "criterion 3", "criterion 4", "criterion 5", "criterion 6"]"""

    response = _call_claude(prompt, max_tokens=512)
    try:
        criteria = _safe_parse_json(response)
        if isinstance(criteria, list):
            return [str(c) for c in criteria[:6]]
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("Failed to parse criteria batch: %s\nResponse: %s", e, response[:200])
    return []


def consolidate_criteria(all_criteria: list[str]) -> list[str]:
    """Merge all extracted criteria labels into exactly 6 final labels."""
    criteria_text = json.dumps(all_criteria, indent=2)
    prompt = f"""Here are purchase criteria labels extracted from multiple review batches:
{criteria_text}

Consolidate these into exactly 6 final criteria labels. Merge near-duplicates. 
Return ONLY a JSON array of 6 strings."""

    response = _call_claude(prompt, max_tokens=512)
    try:
        criteria = _safe_parse_json(response)
        if isinstance(criteria, list) and len(criteria) >= 6:
            return [str(c) for c in criteria[:6]]
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("Failed to consolidate criteria: %s\nResponse: %s", e, response[:200])
    # Fallback: deduplicate manually
    seen: set[str] = set()
    unique = []
    for c in all_criteria:
        lc = c.lower()
        if lc not in seen:
            seen.add(lc)
            unique.append(c)
        if len(unique) == 6:
            break
    return unique


def extract_all_criteria(all_reviews: list[dict]) -> list[str]:
    """
    Batch all reviews → extract criteria per batch → consolidate to 6 final labels.
    """
    logger.info("Extracting criteria from %d total reviews in batches of %d",
                len(all_reviews), BATCH_SIZE_CRITERIA)

    collected: list[str] = []
    for i in range(0, len(all_reviews), BATCH_SIZE_CRITERIA):
        batch = all_reviews[i: i + BATCH_SIZE_CRITERIA]
        batch_criteria = extract_criteria_batch(batch)
        logger.info("  Batch %d: extracted %d criteria: %s",
                    i // BATCH_SIZE_CRITERIA + 1, len(batch_criteria), batch_criteria)
        collected.extend(batch_criteria)
        time.sleep(0.5)

    logger.info("Consolidating %d raw criteria labels...", len(collected))
    final = consolidate_criteria(collected)
    logger.info("Final 6 criteria: %s", final)
    return final


# ── Sentiment Scoring ─────────────────────────────────────────────────────────

def score_asin(asin: str, reviews: list[dict], criteria: list[str]) -> dict[str, float]:
    """
    Score an ASIN against the 6 criteria based on its reviews.
    Returns {criterion: score}.
    """
    reviews_sample = reviews[:BATCH_SIZE_SCORING]
    reviews_text = _format_reviews_for_prompt(reviews_sample)
    criteria_list = "\n".join(f"- {c}" for c in criteria)

    # Build a JSON template hint for Claude
    template = {c: 0.0 for c in criteria}
    template_str = json.dumps(template, indent=2)

    prompt = f"""You are scoring an Amazon product's performance on specific purchase criteria based on customer reviews.

Product ASIN: {asin}
Reviews (sample of {len(reviews_sample)} reviews):
{reviews_text}

Score this product on each of the following criteria from 0 to 10, where:
- 0-3 = customers consistently complain about this
- 4-6 = mixed or neutral feedback
- 7-10 = customers consistently praise this

Criteria to score:
{criteria_list}

Return ONLY a JSON object like:
{template_str}"""

    response = _call_claude(prompt, max_tokens=512)
    try:
        scores = _safe_parse_json(response)
        if isinstance(scores, dict):
            result: dict[str, float] = {}
            for criterion in criteria:
                # fuzzy match: try exact, then lowercase, then first-word
                score = scores.get(criterion)
                if score is None:
                    for k, v in scores.items():
                        if k.lower() == criterion.lower():
                            score = v
                            break
                result[criterion] = float(score) if score is not None else 5.0
            return result
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning("Failed to parse scores for %s: %s\nResponse: %s", asin, e, response[:200])
    # Fallback: neutral scores
    return {c: 5.0 for c in criteria}


def score_all_asins(
    asin_reviews: dict[str, list[dict]],
    criteria: list[str]
) -> dict[str, dict[str, float]]:
    """
    Score all ASINs.
    asin_reviews: {asin: [review dicts]}
    Returns: {asin: {criterion: score}}
    """
    all_scores: dict[str, dict[str, float]] = {}
    for asin, reviews in asin_reviews.items():
        logger.info("Scoring ASIN %s (%d reviews)...", asin, len(reviews))
        scores = score_asin(asin, reviews, criteria)
        all_scores[asin] = scores
        logger.info("  Scores for %s: %s", asin, scores)
        time.sleep(0.5)
    return all_scores
