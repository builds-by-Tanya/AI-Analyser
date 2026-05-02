"""
app.py — Streamlit Report UI for Review Analytics Pipeline
Run with: streamlit run app.py
"""

import sys
from pathlib import Path

import streamlit as st
import pandas as pd
import plotly.express as px

# Make sure we can import project modules
sys.path.insert(0, str(Path(__file__).parent))
import db

st.set_page_config(
    page_title="Amazon Review Analytics",
    page_icon="📊",
    layout="wide",
)

# ── Helpers ───────────────────────────────────────────────────────────────────

@st.cache_data(ttl=60)
def load_data():
    db.init_db()
    listings = {r["asin"]: r for r in db.get_all_listings()}
    revenue_rows = db.get_all_revenue()
    criteria = db.get_criteria()
    scores_matrix = db.get_scores_matrix()
    return listings, revenue_rows, criteria, scores_matrix


def short_label(listing: dict) -> str:
    brand = listing.get("brand") or ""
    title = listing.get("title") or listing["asin"]
    label = f"{brand} — {title}" if brand else title
    return label[:55] + "…" if len(label) > 55 else label


# ── Header ────────────────────────────────────────────────────────────────────

st.title("📊 Amazon Review Analytics")
st.caption("Competitive intelligence powered by AI sentiment analysis")

listings, revenue_rows, criteria, scores_matrix = load_data()

if not listings:
    st.warning("No data found. Run the pipeline first:\n\n```\npython pipeline.py --asins B0XXXXX,...\n```")
    st.stop()

asins = list(listings.keys())

# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    st.header("Listings")
    for i, asin in enumerate(asins):
        l = listings[asin]
        label = "🟡 YOUR LISTING" if i == 0 else f"Competitor {i}"
        st.markdown(f"**{label}**")
        st.caption(f"{short_label(l)}  \nASIN: `{asin}`")
        st.divider()

    if st.button("🔄 Refresh data"):
        st.cache_data.clear()
        st.rerun()

# ── Tabs ──────────────────────────────────────────────────────────────────────

tab1, tab2, tab3 = st.tabs([
    "🌡️ Criteria Heatmap",
    "💰 Revenue Estimates",
    "📉 Gap Analysis",
])

# ════════════════════════════════════════════════════════════════════════════════
# VIEW 1 — Heatmap
# ════════════════════════════════════════════════════════════════════════════════

with tab1:
    st.subheader("Purchase Criteria Heatmap")
    st.caption("Score 0–10: 🔴 poor → 🟢 excellent")

    if not criteria:
        st.info("No criteria extracted yet. Run the pipeline to generate AI analysis.")
    elif not scores_matrix:
        st.info("No scores yet. Ensure the AI scoring stage completed.")
    else:
        # Build DataFrame
        rows = []
        for asin in asins:
            label = ("⭐ " if asin == asins[0] else "") + short_label(listings[asin])
            row = {"Listing": label}
            asin_scores = scores_matrix.get(asin, {})
            for c in criteria:
                row[c] = asin_scores.get(c, None)
            rows.append(row)

        df = pd.DataFrame(rows).set_index("Listing")

        # Apply heatmap styling
        styled = (
            df.style
            .background_gradient(cmap="RdYlGn", axis=None, vmin=0, vmax=10)
            .format("{:.1f}", na_rep="—")
        )

        st.dataframe(styled, use_container_width=True, height=400)

        # Summary stats
        st.markdown("#### Category Averages")
        avg_row = df.mean().rename("Average").to_frame().T
        st.dataframe(
            avg_row.style.background_gradient(cmap="RdYlGn", axis=1, vmin=0, vmax=10)
                         .format("{:.1f}"),
            use_container_width=True,
        )

# ════════════════════════════════════════════════════════════════════════════════
# VIEW 2 — Revenue
# ════════════════════════════════════════════════════════════════════════════════

with tab2:
    st.subheader("Monthly Revenue Estimates")
    st.caption("Based on BSR using Jungle Scout approximation formula")

    if not revenue_rows:
        st.info("No revenue data. Run the pipeline first.")
    else:
        rev_data = []
        for r in revenue_rows:
            asin = r["asin"]
            label = ("⭐ " if asin == asins[0] else "") + short_label(listings[asin])
            rev_data.append({
                "Listing": label,
                "ASIN": asin,
                "BSR": f"{r['bsr']:,}" if r.get("bsr") else "—",
                "Est. Monthly Sales": f"{r['est_monthly_sales']:,}",
                "Est. Monthly Revenue": f"${r['est_monthly_revenue']:,.0f}",
                "_rev_sort": r["est_monthly_revenue"],
            })

        rev_df = pd.DataFrame(rev_data).sort_values("_rev_sort", ascending=False).drop(
            columns=["_rev_sort"]
        )

        st.dataframe(rev_df, use_container_width=True, hide_index=True)

        # Bar chart
        fig = px.bar(
            rev_df,
            x="Listing",
            y=[float(r["Est. Monthly Revenue"].replace("$", "").replace(",", ""))
               for r in rev_data],
            labels={"y": "Est. Monthly Revenue ($)", "x": ""},
            title="Monthly Revenue by Listing",
            color_discrete_sequence=["#6366f1"],
        )
        fig.update_layout(xaxis_tickangle=-30, plot_bgcolor="rgba(0,0,0,0)")
        st.plotly_chart(fig, use_container_width=True)

# ════════════════════════════════════════════════════════════════════════════════
# VIEW 3 — Gap Analysis
# ════════════════════════════════════════════════════════════════════════════════

with tab3:
    st.subheader("Gap Analysis — Your Listing vs Competitors")
    st.caption("Amber = your listing  |  Blue = competitors")

    if not criteria or not scores_matrix:
        st.info("No scores available yet. Run the full pipeline first.")
    else:
        user_asin = asins[0]

        for criterion in criteria:
            st.markdown(f"##### {criterion}")

            chart_rows = []
            for asin in asins:
                label = short_label(listings[asin])
                score = scores_matrix.get(asin, {}).get(criterion, 0)
                is_user = asin == user_asin
                chart_rows.append({
                    "Listing": ("⭐ " if is_user else "") + label,
                    "Score": score,
                    "Type": "Your Listing" if is_user else "Competitor",
                })

            chart_df = pd.DataFrame(chart_rows)

            color_map = {
                "Your Listing": "#f59e0b",   # amber
                "Competitor":  "#3b82f6",    # blue
            }

            fig = px.bar(
                chart_df,
                x="Listing",
                y="Score",
                color="Type",
                color_discrete_map=color_map,
                range_y=[0, 10],
                labels={"Score": "Score (0–10)", "Listing": ""},
            )
            fig.update_layout(
                xaxis_tickangle=-25,
                plot_bgcolor="rgba(0,0,0,0)",
                showlegend=True,
                height=320,
                margin=dict(t=10, b=80),
            )
            # Add a reference line at the category average
            avg = chart_df["Score"].mean()
            fig.add_hline(
                y=avg, line_dash="dot", line_color="gray",
                annotation_text=f"avg {avg:.1f}",
                annotation_position="top right",
            )
            st.plotly_chart(fig, use_container_width=True)

        # Opportunity summary
        st.markdown("---")
        st.markdown("#### 🎯 Opportunity Summary")
        st.caption("Criteria where your listing scores below the category average")

        user_scores = scores_matrix.get(user_asin, {})
        opps = []
        for c in criteria:
            all_scores_for_c = [
                scores_matrix.get(a, {}).get(c, 5.0) for a in asins
            ]
            avg_c = sum(all_scores_for_c) / len(all_scores_for_c)
            your_score = user_scores.get(c, 5.0)
            gap = avg_c - your_score
            opps.append({
                "Criterion": c,
                "Your Score": round(your_score, 1),
                "Category Avg": round(avg_c, 1),
                "Gap": round(gap, 1),
            })

        opp_df = pd.DataFrame(opps).sort_values("Gap", ascending=False)

        def highlight_gap(val):
            if isinstance(val, float):
                if val > 1.5:
                    return "background-color: #fee2e2; color: #991b1b"
                elif val > 0.5:
                    return "background-color: #fef3c7; color: #92400e"
            return ""

        st.dataframe(
            opp_df.style.applymap(highlight_gap, subset=["Gap"]).format({
                "Your Score": "{:.1f}",
                "Category Avg": "{:.1f}",
                "Gap": "{:+.1f}",
            }),
            use_container_width=True,
            hide_index=True,
        )

# ── Footer ────────────────────────────────────────────────────────────────────

st.markdown("---")
st.caption(
    "Review Analytics Pipeline · Powered by Rainforest API + Claude AI · "
    f"{len(asins)} ASINs analysed"
)
