"""
db.py — SQLite setup and query helpers for Review Analytics Pipeline
"""

import sqlite3
import json
import logging
from pathlib import Path

DB_PATH = Path("data/reviews.db")
logger = logging.getLogger(__name__)


def get_connection() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create all tables if they don't exist."""
    conn = get_connection()
    with conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS listings (
                asin        TEXT PRIMARY KEY,
                title       TEXT,
                brand       TEXT,
                price       REAL,
                bsr         INTEGER,
                rating      REAL,
                review_count INTEGER,
                raw_json    TEXT
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                asin        TEXT,
                rating      REAL,
                title       TEXT,
                body        TEXT,
                verified    INTEGER,
                date        TEXT
            );

            CREATE TABLE IF NOT EXISTS revenue (
                asin                TEXT PRIMARY KEY,
                est_monthly_sales   INTEGER,
                est_monthly_revenue REAL
            );

            CREATE TABLE IF NOT EXISTS criteria (
                id      INTEGER PRIMARY KEY AUTOINCREMENT,
                label   TEXT UNIQUE
            );

            CREATE TABLE IF NOT EXISTS scores (
                asin        TEXT,
                criterion   TEXT,
                score       REAL,
                PRIMARY KEY (asin, criterion)
            );
        """)
    conn.close()
    logger.info("Database initialised at %s", DB_PATH)


# ── Listings ──────────────────────────────────────────────────────────────────

def upsert_listing(asin: str, title: str, brand: str, price: float,
                   bsr: int, rating: float, review_count: int, raw: dict):
    conn = get_connection()
    with conn:
        conn.execute("""
            INSERT INTO listings (asin, title, brand, price, bsr, rating, review_count, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(asin) DO UPDATE SET
                title=excluded.title, brand=excluded.brand, price=excluded.price,
                bsr=excluded.bsr, rating=excluded.rating, review_count=excluded.review_count,
                raw_json=excluded.raw_json
        """, (asin, title, brand, price, bsr, rating, review_count, json.dumps(raw)))
    conn.close()


def get_listing(asin: str) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM listings WHERE asin=?", (asin,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_listings() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM listings").fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Reviews ───────────────────────────────────────────────────────────────────

def insert_reviews(asin: str, reviews: list[dict]):
    conn = get_connection()
    with conn:
        conn.executemany("""
            INSERT INTO reviews (asin, rating, title, body, verified, date)
            VALUES (?, ?, ?, ?, ?, ?)
        """, [
            (asin,
             r.get("rating"),
             r.get("title", ""),
             r.get("body", ""),
             1 if r.get("verified_purchase") else 0,
             r.get("date", ""))
            for r in reviews
        ])
    conn.close()


def get_reviews_for_asin(asin: str, limit: int = 200) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM reviews WHERE asin=? LIMIT ?", (asin, limit)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_reviews(limit: int = 800) -> list[dict]:
    conn = get_connection()
    rows = conn.execute("SELECT * FROM reviews LIMIT ?", (limit,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def count_reviews(asin: str) -> int:
    conn = get_connection()
    n = conn.execute("SELECT COUNT(*) FROM reviews WHERE asin=?", (asin,)).fetchone()[0]
    conn.close()
    return n


# ── Revenue ───────────────────────────────────────────────────────────────────

def upsert_revenue(asin: str, est_sales: int, est_revenue: float):
    conn = get_connection()
    with conn:
        conn.execute("""
            INSERT INTO revenue (asin, est_monthly_sales, est_monthly_revenue)
            VALUES (?, ?, ?)
            ON CONFLICT(asin) DO UPDATE SET
                est_monthly_sales=excluded.est_monthly_sales,
                est_monthly_revenue=excluded.est_monthly_revenue
        """, (asin, est_sales, est_revenue))
    conn.close()


def get_all_revenue() -> list[dict]:
    conn = get_connection()
    rows = conn.execute("""
        SELECT r.*, l.title, l.bsr, l.price
        FROM revenue r
        JOIN listings l ON r.asin = l.asin
        ORDER BY r.est_monthly_revenue DESC
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Criteria ──────────────────────────────────────────────────────────────────

def set_criteria(labels: list[str]):
    conn = get_connection()
    with conn:
        conn.execute("DELETE FROM criteria")
        conn.executemany(
            "INSERT OR IGNORE INTO criteria (label) VALUES (?)",
            [(lbl,) for lbl in labels]
        )
    conn.close()


def get_criteria() -> list[str]:
    conn = get_connection()
    rows = conn.execute("SELECT label FROM criteria ORDER BY id").fetchall()
    conn.close()
    return [r["label"] for r in rows]


# ── Scores ────────────────────────────────────────────────────────────────────

def upsert_score(asin: str, criterion: str, score: float):
    conn = get_connection()
    with conn:
        conn.execute("""
            INSERT INTO scores (asin, criterion, score)
            VALUES (?, ?, ?)
            ON CONFLICT(asin, criterion) DO UPDATE SET score=excluded.score
        """, (asin, criterion, score))
    conn.close()


def get_scores_matrix() -> dict[str, dict[str, float]]:
    """Returns {asin: {criterion: score}}"""
    conn = get_connection()
    rows = conn.execute("SELECT asin, criterion, score FROM scores").fetchall()
    conn.close()
    matrix: dict[str, dict[str, float]] = {}
    for r in rows:
        matrix.setdefault(r["asin"], {})[r["criterion"]] = r["score"]
    return matrix
