"""
streamlit_app.py
================
Streamlit dashboard for the Hyperlocal Rainfall Prediction System.

Displays live rain / no-rain predictions with temperature and humidity
for 15 Bangalore micro-locations.

Run with:
    streamlit run app/streamlit_app.py
"""

import sys
import os

# ---------------------------------------------------------------------------
# Allow imports from the project root (one level up from app/)
# ---------------------------------------------------------------------------
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import streamlit as st
from predict import predict_all, LOCATIONS

# ---------------------------------------------------------------------------
# Page configuration
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Hyperlocal Rainfall Prediction",
    page_icon="🌧️",
    layout="wide",
)

# ---------------------------------------------------------------------------
# Custom CSS for a clean, modern look
# ---------------------------------------------------------------------------
st.markdown("""
<style>
    .main { padding: 1rem 2rem; }
    .location-card {
        background: linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%);
        border-radius: 16px;
        padding: 1.5rem;
        margin-bottom: 1rem;
        color: white;
        box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        transition: transform 0.2s ease;
    }
    .location-card:hover { transform: translateY(-2px); }
    .location-name {
        font-size: 1.15rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
    }
    .prediction-rain {
        font-size: 1.3rem;
        font-weight: 600;
        color: #ffcf56;
    }
    .prediction-norain {
        font-size: 1.3rem;
        font-weight: 600;
        color: #7dffb3;
    }
    .detail-row {
        font-size: 0.9rem;
        opacity: 0.85;
        margin-top: 0.4rem;
    }
    .header-title {
        text-align: center;
        font-size: 2.2rem;
        font-weight: 800;
        margin-bottom: 0.2rem;
    }
    .header-sub {
        text-align: center;
        font-size: 1rem;
        opacity: 0.7;
        margin-bottom: 2rem;
    }
</style>
""", unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
st.markdown('<div class="header-title">🌧️ Hyperlocal Rainfall Prediction System</div>', unsafe_allow_html=True)
st.markdown('<div class="header-sub">Real-time ML-based predictions for Bangalore micro-locations</div>', unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Fetch predictions
# ---------------------------------------------------------------------------
with st.spinner("Fetching live weather data and running predictions..."):
    results = predict_all()

# ---------------------------------------------------------------------------
# Display predictions in a responsive grid
# ---------------------------------------------------------------------------
cols_per_row = 3
for i in range(0, len(results), cols_per_row):
    cols = st.columns(cols_per_row)
    for j, col in enumerate(cols):
        idx = i + j
        if idx >= len(results):
            break
        r = results[idx]

        pred_text = r["prediction"]
        is_rain = "Rain Expected" in pred_text
        css_class = "prediction-rain" if is_rain else "prediction-norain"

        temp = r["details"].get("temperature_2m", "N/A")
        hum  = r["details"].get("relative_humidity_2m", "N/A")
        wind = r["details"].get("windspeed_10m", "N/A")
        cloud = r["details"].get("cloudcover", "N/A")

        card_html = f"""
        <div class="location-card">
            <div class="location-name">📍 {r['location']}</div>
            <div class="{css_class}">{pred_text}</div>
            <div class="detail-row">🌡️ Temp: {temp} °C &nbsp; | &nbsp; 💧 Humidity: {hum}%</div>
            <div class="detail-row">💨 Wind: {wind} km/h &nbsp; | &nbsp; ☁️ Cloud: {cloud}%</div>
        </div>
        """
        col.markdown(card_html, unsafe_allow_html=True)

# ---------------------------------------------------------------------------
# Footer
# ---------------------------------------------------------------------------
st.markdown("---")
st.caption("Data source: Open-Meteo API (free) · Model: Random Forest · Built with Streamlit")
