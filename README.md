# 📊 Amazon Review Analytics Pipeline

AI-powered competitive intelligence for Amazon listings — scrapes 1000+ reviews per ASIN, extracts purchase criteria with Claude, scores each listing, and visualises everything in a Streamlit dashboard.

---

## Architecture

```
Rainforest API          Claude AI              Streamlit
(Amazon scraping)  →  (criteria + scores)  →  (visual report)
       ↓                      ↓
    SQLite DB ←──────────────────────────────────────────
```

**Pipeline stages:**
1. **Scrape** — product metadata + 1000 reviews per ASIN via Rainforest API
2. **Revenue** — monthly sales & revenue estimation from BSR
3. **Criteria** — AI extracts the 6 key purchase criteria from all reviews
4. **Scoring** — AI scores each listing 0–10 on every criterion

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure API keys

```bash
cp .env.example .env
# Edit .env and add your keys:
#   RAINFOREST_API_KEY=...
#   ANTHROPIC_API_KEY=...
```

### 3. Run the pipeline

```bash
python pipeline.py --asins B08N5WRWNW,B07XYZ1234,B09ABC5678,...
```

The first ASIN is treated as **your listing**; the rest are competitors.

Optional flags:
- `--skip-scrape` — use cached DB data (skip Rainforest API calls)
- `--skip-ai` — skip Claude API stages

### 4. Launch the report

```bash
streamlit run app.py
```

Open http://localhost:8501 in your browser.

---

## Project Structure

```
review-analytics/
├── README.md
├── requirements.txt
├── .env.example          # API key template
├── pipeline.py           # Orchestrator (run this)
├── scraper.py            # Rainforest API calls
├── analyzer.py           # Claude API calls
├── revenue.py            # BSR → revenue formula
├── db.py                 # SQLite setup and queries
├── app.py                # Streamlit report UI
└── data/
    └── raw/              # Raw JSON from Rainforest API (gitignored)
```

---

## Report Views

| View | Description |
|------|-------------|
| 🌡️ **Criteria Heatmap** | 10 ASINs × 6 criteria scored 0–10, red→green heatmap |
| 💰 **Revenue Estimates** | BSR-based monthly sales & revenue, sorted by revenue |
| 📉 **Gap Analysis** | Bar charts per criterion with your listing highlighted in amber |

---

## Revenue Formula

Uses the standard Jungle Scout BSR approximation:

```python
est_monthly_sales = round(math.exp(10.5 - 0.85 * math.log(bsr)))
est_monthly_revenue = est_monthly_sales * price
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `RAINFOREST_API_KEY` | Your Rainforest API key (https://www.rainforestapi.com) |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (https://console.anthropic.com) |

---

## Notes

- All API calls include retry logic with exponential backoff (max 3 retries)
- Pipeline logs to both stdout and `pipeline.log`
- The Streamlit app auto-refreshes cached data every 60 seconds
- All monetary values in USD
