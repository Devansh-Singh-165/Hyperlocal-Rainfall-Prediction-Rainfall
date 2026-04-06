"""
api/server.py
=============
Flask API backend for the Hyperlocal Rainfall Prediction System.

Endpoints:
  GET /api/predictions       – rain/no-rain for all 15 locations
  GET /api/location/<name>/weather – last 5 days + next 5 days hourly weather
  GET /api/location/<name>/aqi     – Air Quality Index from Open-Meteo
"""

import sys
import os

# Allow imports from the project root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
import pandas as pd
from predict import predict_all, LOCATIONS

app = Flask(__name__)
CORS(app)

# ---------------------------------------------------------------------------
# Open-Meteo API endpoints
# ---------------------------------------------------------------------------
FORECAST_URL   = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_URL    = "https://archive-api.open-meteo.com/v1/archive"
AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"


@app.route("/api/predictions")
def get_predictions():
    """Return rain/no-rain predictions for all locations."""
    try:
        results = predict_all()
        return jsonify({"status": "ok", "predictions": results})
    except Exception as exc:
        return jsonify({"status": "error", "message": str(exc)}), 500


@app.route("/api/location/<name>/weather")
def get_weather(name: str):
    """
    Return combined historical (last 10 hours) + forecast (next 10 hours)
    hourly weather for a specific location.
    """
    if name not in LOCATIONS:
        return jsonify({"status": "error", "message": f"Unknown location: {name}"}), 404

    lat, lon = LOCATIONS[name]

    # --- Last 10 hours + next 10 hours ---
    try:
        hist_resp = requests.get(FORECAST_URL, params={
            "latitude":   lat,
            "longitude":  lon,
            "hourly":     "temperature_2m,relative_humidity_2m,precipitation,cloudcover,windspeed_10m",
            "past_hours":  10,
            "forecast_hours": 10,
            "timezone":   "Asia/Kolkata",
        }, timeout=15)
        hist_resp.raise_for_status()
        data = hist_resp.json().get("hourly", {})

        weather = {
            "time":                data.get("time", []),
            "temperature_2m":      data.get("temperature_2m", []),
            "relative_humidity_2m": data.get("relative_humidity_2m", []),
            "precipitation":       data.get("precipitation", []),
            "cloudcover":          data.get("cloudcover", []),
            "windspeed_10m":       data.get("windspeed_10m", []),
        }

        return jsonify({"status": "ok", "location": name, "weather": weather})

    except requests.exceptions.RequestException as exc:
        return jsonify({"status": "error", "message": str(exc)}), 502


@app.route("/api/location/<name>/aqi")
def get_aqi(name: str):
    """
    Return Air Quality data for a location using Open-Meteo Air Quality API.
    Returns last 10 hours + next 10 hours of hourly AQI data.
    """
    if name not in LOCATIONS:
        return jsonify({"status": "error", "message": f"Unknown location: {name}"}), 404

    lat, lon = LOCATIONS[name]

    try:
        resp = requests.get(AIR_QUALITY_URL, params={
            "latitude":      lat,
            "longitude":     lon,
            "hourly":        "pm2_5,pm10,uv_index,european_aqi",
            "past_hours":    10,
            "forecast_hours": 10,
            "timezone":      "Asia/Kolkata",
        }, timeout=15)
        resp.raise_for_status()
        data = resp.json().get("hourly", {})

        aqi = {
            "time":          data.get("time", []),
            "pm2_5":         data.get("pm2_5", []),
            "pm10":          data.get("pm10", []),
            "uv_index":      data.get("uv_index", []),
            "european_aqi":  data.get("european_aqi", []),
        }

        return jsonify({"status": "ok", "location": name, "aqi": aqi})

    except requests.exceptions.RequestException as exc:
        return jsonify({"status": "error", "message": str(exc)}), 502


if __name__ == "__main__":
    print("🚀 Starting Hyperlocal Rainfall API on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
