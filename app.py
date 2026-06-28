"""
app.py — Streamlit Report UI for Review Analytics Pipeline
Run with: streamlit run app.py
"""

import sys
from pathlib import Path

import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

# Make sure we can import project modules
sys.path.insert(0, str(Path(__file__).parent))
import db
import pipeline

st.set_page_config(
    page_title="Amazon Review Analytics",
    page_icon="✨",
    layout="wide",
    initial_sidebar_state="expanded"
)

CUSTOM_CSS = """
<style>
    /* Import Google Font */
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

    html, body, [class*="css"] {
        font-family: 'Outfit', sans-serif;
    }

    /* Global Dark/Premium Background */
    .stApp {
        background: radial-gradient(circle at 15% 50%, #161625 0%, #0a0a10 100%);
        color: #e2e8f0;
    }

    /* Hide standard Streamlit header and footer */
    header {visibility: hidden;}
    footer {visibility: hidden;}

    /* Glassmorphism containers for tabs and main content */
    .stTabs [data-baseweb="tab-list"] {
        gap: 12px;
        background-color: rgba(30, 30, 45, 0.4);
        padding: 10px;
        border-radius: 12px;
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .stTabs [data-baseweb="tab"] {
        border-radius: 8px;
        padding: 8px 20px;
        background-color: transparent;
        color: #94a3b8;
        border: 1px solid transparent;
        transition: all 0.3s ease;
        font-weight: 500;
    }

    .stTabs [data-baseweb="tab"]:hover {
        color: #fff;
        background-color: rgba(139, 92, 246, 0.15);
    }

    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #8b5cf6, #4f46e5) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
    }

    /* Dataframes glassmorphism */
    [data-testid="stDataFrame"] {
        background: rgba(20, 20, 30, 0.6);
        border-radius: 16px;
        padding: 1rem;
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
    }
    
    /* Metrics Container */
    [data-testid="stMetric"] {
        background: rgba(30, 30, 45, 0.5);
        border-radius: 16px;
        padding: 1.5rem;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        transition: transform 0.3s ease;
    }
    [data-testid="stMetric"]:hover {
        transform: translateY(-5px);
        border: 1px solid rgba(139, 92, 246, 0.3);
    }

    /* Typography */
    h1 {
        background: -webkit-linear-gradient(45deg, #c4b5fd, #818cf8);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        font-weight: 700 !important;
        margin-bottom: 0.2rem;
        letter-spacing: -0.5px;
    }

    h2, h3, h4, h5 {
        color: #f8fafc;
        font-weight: 600 !important;
    }

    /* Sidebar Glassmorphism */
    [data-testid="stSidebar"] {
        background-color: rgba(10, 10, 16, 0.8) !important;
        backdrop-filter: blur(20px);
        border-right: 1px solid rgba(255, 255, 255, 0.05);
    }

    /* Buttons */
    .stButton>button {
        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
        color: white;
        border: none;
        border-radius: 10px;
        padding: 0.6rem 1.2rem;
        font-weight: 600;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 4px 14px 0 rgba(139, 92, 246, 0.39);
        width: 100%;
    }
    .stButton>button:hover {
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
    }
    
    /* Plotly container adjustments */
    .js-plotly-plot {
        background: rgba(20, 20, 30, 0.4);
        border-radius: 16px;
        padding: 10px;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    hr {
        border-color: rgba(255, 255, 255, 0.05);
        margin: 2rem 0;
    }
</style>
"""

st.markdown(CUSTOM_CSS, unsafe_allow_html=True)


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

st.title("✨ AI Review Analytics")
st.markdown("<p style='color: #94a3b8; font-size: 1.1rem; margin-bottom: 2rem;'>Competitive intelligence powered by advanced sentiment analysis & machine learning</p>", unsafe_allow_html=True)

listings, your_revenue_rows, criteria, scores_matrix = load_data()

# ── Sidebar ───────────────────────────────────────────────────────────────────

with st.sidebar:
    st.markdown("<h2 style='text-align: center; margin-bottom: 1.5rem;'>Control Panel</h2>", unsafe_allow_html=True)
    
    with st.expander("🚀 Run New Analysis", expanded=not listings):
        st.markdown("<p style='font-size: 0.85rem; color: #94a3b8; margin-bottom: 1rem;'>Enter a list of 2 to 10 ASINs to scrape and analyze. The first ASIN is YOUR listing; others are competitors.</p>", unsafe_allow_html=True)
        
        # Default value: join existing ASINs if any, otherwise example
        default_asins = ",".join(listings.keys()) if listings else "B08N5WRWNW,B07XYZ1234,B09B2SB9Y6"
        asin_input_val = st.text_area("ASINs (comma-separated)", value=default_asins, help="e.g. B08N5WRWNW,B07XYZ1234,B09B2SB9Y6")
        
        review_limit = st.selectbox(
            "Reviews per ASIN",
            options=[50, 100, 200, 500, 1000],
            index=1,
            help="Higher numbers take longer and use more API credits. 100-200 is recommended."
        )
        
        col_scrape, col_ai = st.columns(2)
        with col_scrape:
            skip_scrape = st.checkbox("Skip Scrape", value=False, help="Use cached local reviews in DB.")
        with col_ai:
            skip_ai = st.checkbox("Skip AI", value=False, help="Skip Claude AI criteria & scoring.")
            
        run_btn = st.button("Start Analysis")
        
        if run_btn:
            # Parse ASINs
            asins_to_run = [a.strip().upper() for a in asin_input_val.split(",") if a.strip()]
            if not asins_to_run or len(asins_to_run) < 2:
                st.error("Please enter at least 2 ASINs (1 yours + 1 or more competitors).")
            elif len(asins_to_run) > 10:
                st.warning("More than 10 ASINs entered. Only the first 10 will be analyzed.")
                asins_to_run = asins_to_run[:10]
            else:
                # Run pipeline inside a status container
                with st.status("Running analysis pipeline...", expanded=True) as status:
                    try:
                        status.write("Initializing Database...")
                        db.init_db()
                        
                        # Stage 1
                        if not skip_scrape:
                            status.write("Stage 1: Scraping listings & reviews (Rainforest)...")
                            pipeline.run_scrape(asins_to_run, target_reviews=review_limit)
                        else:
                            status.write("Stage 1: Skipping scraping stage (using cached data).")
                            
                        # Stage 2
                        status.write("Stage 2: Estimating monthly sales & revenue...")
                        pipeline.run_revenue()
                        
                        # Stage 3 & 4
                        if not skip_ai:
                            status.write("Stage 3: Extracting customer purchase criteria (Claude AI)...")
                            pipeline.run_criteria()
                            
                            status.write("Stage 4: Scoring listings against criteria (Claude AI)...")
                            pipeline.run_scoring(asins_to_run)
                        else:
                            status.write("Stages 3 & 4: Skipping AI criteria and scoring.")
                            
                        status.update(label="Analysis complete! Reloading...", state="complete")
                        st.success("Successfully completed analysis!")
                        
                        # Clear cache and rerun
                        st.cache_data.clear()
                        st.rerun()
                    except Exception as e:
                        status.update(label="Pipeline failed!", state="error")
                        st.error(f"Error running pipeline: {str(e)}")

    if listings:
        st.markdown("<hr style='border-color: rgba(255,255,255,0.05); margin: 1.5rem 0;'>", unsafe_allow_html=True)
        st.markdown("<h3 style='font-size: 1rem; margin-bottom: 0.8rem; color: #f8fafc;'>Competitor Matrix</h3>", unsafe_allow_html=True)
        
        for i, asin in enumerate(listings.keys()):
            l = listings[asin]
            is_user = i == 0
            label = "✨ YOUR LISTING" if is_user else f"🎯 Competitor {i}"
            color = "#8b5cf6" if is_user else "#3b82f6"
            
            st.markdown(f"""
            <div style="background: rgba(30,30,45,0.4); padding: 1rem; border-radius: 12px; margin-bottom: 1rem; border-left: 4px solid {color}; border-top: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); border-bottom: 1px solid rgba(255,255,255,0.05);">
                <div style="font-weight: 600; font-size: 0.9rem; color: {color}; margin-bottom: 0.3rem;">{label}</div>
                <div style="font-size: 0.85rem; color: #e2e8f0; margin-bottom: 0.3rem; line-height: 1.4;">{short_label(l)}</div>
                <div style="font-size: 0.75rem; color: #64748b; font-family: monospace;">ASIN: {asin}</div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("🔄 Refresh Data Analysis"):
            st.cache_data.clear()
            st.rerun()

# ── Main Content / Checks ─────────────────────────────────────────────────────

if not listings:
    st.error("### 🚀 No Data Found\nIt looks like the pipeline hasn't been run yet. Please enter your ASINs in the sidebar on the left and click **'Start Analysis'** to get started!")
    st.stop()

asins = list(listings.keys())
user_asin = asins[0]
revenue_rows = your_revenue_rows

# High-level Metrics
col1, col2, col3, col4 = st.columns(4)
with col1:
    st.metric("Total Listings Analyzed", len(asins))
with col2:
    total_rev = sum([r.get("est_monthly_revenue", 0) for r in revenue_rows])
    st.metric("Market M. Revenue", f"${total_rev:,.0f}")
with col3:
    st.metric("Criteria Tracked", len(criteria) if criteria else 0)
with col4:
    user_rev = next((r.get("est_monthly_revenue", 0) for r in revenue_rows if r["asin"] == user_asin), 0)
    st.metric("Your Est. Revenue", f"${user_rev:,.0f}")

st.markdown("<br>", unsafe_allow_html=True)

# ── Tabs ──────────────────────────────────────────────────────────────────────

tab1, tab2, tab3 = st.tabs([
    "🌡️ Intelligence Heatmap",
    "💰 Revenue Estimations",
    "📉 Opportunity Gap Analysis",
])

# ════════════════════════════════════════════════════════════════════════════════
# VIEW 1 — Heatmap
# ════════════════════════════════════════════════════════════════════════════════

with tab1:
    st.markdown("### Purchase Criteria Heatmap")
    st.caption("Sentiment Score 0–10: 🔴 Poor → 🟢 Excellent")

    if not criteria:
        st.info("No criteria extracted yet. Run the pipeline to generate AI analysis.")
    elif not scores_matrix:
        st.info("No scores yet. Ensure the AI scoring stage completed.")
    else:
        # Build DataFrame
        rows = []
        for asin in asins:
            label = ("✨ " if asin == user_asin else "") + short_label(listings[asin])
            row = {"Listing": label}
            asin_scores = scores_matrix.get(asin, {})
            for c in criteria:
                row[c] = asin_scores.get(c, None)
            rows.append(row)

        df = pd.DataFrame(rows).set_index("Listing")

        # Custom dark colormap for heatmap
        styled = (
            df.style
            .background_gradient(cmap="viridis", axis=None, vmin=0, vmax=10)
            .format("{:.1f}", na_rep="—")
        )

        st.dataframe(styled, use_container_width=True, height=400)

        # Summary stats
        st.markdown("#### Category Averages")
        avg_row = df.mean().rename("Average").to_frame().T
        st.dataframe(
            avg_row.style.background_gradient(cmap="viridis", axis=1, vmin=0, vmax=10)
                         .format("{:.1f}"),
            use_container_width=True,
        )

# ════════════════════════════════════════════════════════════════════════════════
# VIEW 2 — Revenue
# ════════════════════════════════════════════════════════════════════════════════

with tab2:
    st.markdown("### Monthly Revenue Estimations")
    st.caption("Derived from BSR using Jungle Scout algorithmic approximation")

    if not revenue_rows:
        st.info("No revenue data. Run the pipeline first.")
    else:
        rev_data = []
        for r in revenue_rows:
            asin = r["asin"]
            label = ("✨ " if asin == user_asin else "") + short_label(listings[asin])
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

        st.markdown("<br>", unsafe_allow_html=True)
        
        # Premium Bar Chart
        raw_revs = [float(r["Est. Monthly Revenue"].replace("$", "").replace(",", "")) for r in rev_data]
        
        # Color specific bars (highlight user's listing)
        colors = ["#8b5cf6" if "✨" in r["Listing"] else "#3b82f6" for r in rev_data]

        fig = go.Figure(data=[
            go.Bar(
                x=[r["Listing"] for r in rev_data],
                y=raw_revs,
                marker_color=colors,
                marker_line_color='rgba(255,255,255,0.1)',
                marker_line_width=1,
                opacity=0.9,
                hovertemplate="<b>%{x}</b><br>Revenue: $%{y:,.0f}<extra></extra>"
            )
        ])
        
        fig.update_layout(
            title=dict(text="Market Share Distribution", font=dict(size=20, color="#f8fafc")),
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#cbd5e1"),
            xaxis=dict(tickangle=-30, showgrid=False, title=""),
            yaxis=dict(showgrid=True, gridcolor="rgba(255,255,255,0.05)", title="Est. Revenue ($)"),
            margin=dict(t=60, b=100, l=60, r=20),
            hoverlabel=dict(bgcolor="rgba(15,17,26,0.9)", font_size=14, font_family="Outfit")
        )
        st.plotly_chart(fig, use_container_width=True)

# ════════════════════════════════════════════════════════════════════════════════
# VIEW 3 — Gap Analysis
# ════════════════════════════════════════════════════════════════════════════════

with tab3:
    st.markdown("### Competitive Opportunity Gap Analysis")
    st.caption("Identify areas where your listing underperforms against the market average")

    if not criteria or not scores_matrix:
        st.info("No scores available yet. Run the full pipeline first.")
    else:
        st.markdown("<br>", unsafe_allow_html=True)
        
        # Radar Chart for Overall Comparison
        user_scores = scores_matrix.get(user_asin, {})
        avg_scores = {}
        for c in criteria:
            all_scores = [scores_matrix.get(a, {}).get(c, 5.0) for a in asins]
            avg_scores[c] = sum(all_scores) / len(all_scores)
            
        fig_radar = go.Figure()
        
        fig_radar.add_trace(go.Scatterpolar(
            r=[avg_scores[c] for c in criteria],
            theta=criteria,
            fill='toself',
            name='Market Average',
            line_color='#3b82f6',
            fillcolor='rgba(59, 130, 246, 0.2)'
        ))
        
        fig_radar.add_trace(go.Scatterpolar(
            r=[user_scores.get(c, 5.0) for c in criteria],
            theta=criteria,
            fill='toself',
            name='Your Listing',
            line_color='#8b5cf6',
            fillcolor='rgba(139, 92, 246, 0.4)'
        ))

        fig_radar.update_layout(
            polar=dict(
                radialaxis=dict(visible=True, range=[0, 10], gridcolor="rgba(255,255,255,0.1)", tickcolor="rgba(255,255,255,0.1)", color="#94a3b8"),
                angularaxis=dict(gridcolor="rgba(255,255,255,0.1)", linecolor="rgba(255,255,255,0.1)")
            ),
            showlegend=True,
            plot_bgcolor="rgba(0,0,0,0)",
            paper_bgcolor="rgba(0,0,0,0)",
            font=dict(color="#cbd5e1", size=12),
            margin=dict(t=40, b=40)
        )
        
        st.plotly_chart(fig_radar, use_container_width=True)

        st.markdown("---")
        st.markdown("#### 🎯 Critical Opportunity Summary")
        st.caption("Focus on criteria where the gap between your score and the market average is widest.")

        opps = []
        for c in criteria:
            avg_c = avg_scores[c]
            your_score = user_scores.get(c, 5.0)
            gap = avg_c - your_score
            opps.append({
                "Criterion": c,
                "Your Score": round(your_score, 1),
                "Market Avg": round(avg_c, 1),
                "Opportunity Gap": round(gap, 1),
            })

        opp_df = pd.DataFrame(opps).sort_values("Opportunity Gap", ascending=False)

        def highlight_gap(val):
            if isinstance(val, float):
                if val > 1.5:
                    return "background: rgba(239, 68, 68, 0.2); color: #f87171; font-weight: 600;" # red glass
                elif val > 0.5:
                    return "background: rgba(245, 158, 11, 0.2); color: #fbbf24; font-weight: 600;" # amber glass
            return ""

        st.dataframe(
            opp_df.style.applymap(highlight_gap, subset=["Opportunity Gap"]).format({
                "Your Score": "{:.1f}",
                "Market Avg": "{:.1f}",
                "Opportunity Gap": "{:+.1f}",
            }),
            use_container_width=True,
            hide_index=True,
        )

# ── Footer ────────────────────────────────────────────────────────────────────

st.markdown("<br><br>", unsafe_allow_html=True)
st.markdown("---")
st.markdown(
    f"<div style='text-align: center; color: #64748b; font-size: 0.85rem; padding: 2rem 0;'>"
    f"<b>✨ Premium Analytics Pipeline</b><br>"
    f"Powered by Advanced Rainforest API + Claude AI Engine<br>"
    f"Analyzing {len(asins)} market leaders</div>",
    unsafe_allow_html=True
)
