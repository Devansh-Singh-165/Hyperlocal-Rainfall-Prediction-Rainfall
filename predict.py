"""
predict.py
==========
Fetches live weather data from the Open-Meteo Forecast API, applies
the same feature pipeline used during training, loads the saved model,
and outputs a rain / no-rain prediction for each Bangalore micro-location.

Feature pipeline (must match train.py):
  - Target features used: temperature_2m, relative_humidity_2m,
    cloudcover, windspeed_10m
  - Time:    hour, month
  - Lag:     rain_lag1, humidity_lag1
  - Rolling: humidity_avg_3
"""

import requests
import pandas as pd
import numpy as np
import joblib

# ---------------------------------------------------------------------------
# Bangalore micro-locations (same as fetch_data.py)
# ---------------------------------------------------------------------------
LOCATIONS = {
    "Cubbon Park":         (12.9763, 77.5929),
    "MG Road":             (12.9756, 77.6050),
    "Shivaji Nagar":       (12.9866, 77.6050),
    "Jayanagar":           (12.9250, 77.5938),
    "Koramangala":         (12.9279, 77.6271),
    "BTM Layout":          (12.9166, 77.6101),
    "JP Nagar":            (12.9063, 77.5857),
    "Whitefield":          (12.9698, 77.7500),
    "Indiranagar":         (12.9719, 77.6412),
    "KR Puram":            (13.0077, 77.6950),
    "Rajajinagar":         (12.9915, 77.5550),
    "Malleshwaram":        (13.0031, 77.5696),
    "Mahalakshmi Layout":  (13.0144, 77.5562),
    "Hebbal":              (13.0358, 77.5970),
    "Yelahanka":           (13.1007, 77.5963),
}

# Open-Meteo Forecast API endpoint
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

# Feature columns – MUST remain identical to train.py
FEATURE_COLS = [
    "temperature_2m",
    "relative_humidity_2m",
    "cloudcover",
    "windspeed_10m",
    "hour",
    "month",
    "rain_lag1",
    "humidity_lag1",
    "humidity_avg_3",
]

MODEL_PATH = "model/rain_model.pkl"


def fetch_forecast(name: str, lat: float, lon: float) -> pd.DataFrame:
    """
    Fetch the current hourly forecast for a single location.
    We request past_hours=6 so we have enough history for lag/rolling features.
    """
    params = {
        "latitude":   lat,
        "longitude":  lon,
        "hourly":     "temperature_2m,relative_humidity_2m,precipitation,cloudcover,windspeed_10m",
        "timezone":   "Asia/Kolkata",
        "past_hours":  6,
        "forecast_hours": 1,
    }

    try:
        resp = requests.get(FORECAST_URL, params=params, timeout=15)
        resp.raise_for_status()
    except requests.exceptions.RequestException as exc:
        print(f"  ⚠ Error fetching forecast for {name}: {exc}")
        return pd.DataFrame()

    hourly = resp.json().get("hourly", {})
    df = pd.DataFrame({
        "datetime":             hourly.get("time", []),
        "temperature_2m":       hourly.get("temperature_2m", []),
        "relative_humidity_2m": hourly.get("relative_humidity_2m", []),
        "precipitation":        hourly.get("precipitation", []),
        "cloudcover":           hourly.get("cloudcover", []),
        "windspeed_10m":        hourly.get("windspeed_10m", []),
    })
    df["datetime"] = pd.to_datetime(df["datetime"])
    df["location"] = name
    return df


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply the same feature engineering as train.py:
      hour, month, rain_lag1, humidity_lag1, humidity_avg_3.
    """
    df = df.sort_values("datetime").reset_index(drop=True)

    # Binary rain column (used for lag)
    df["rain"] = (df["precipitation"] > 0).astype(int)

    # Time features
    df["hour"]  = df["datetime"].dt.hour
    df["month"] = df["datetime"].dt.month

    # Lag features
    df["rain_lag1"]     = df["rain"].shift(1)
    df["humidity_lag1"] = df["relative_humidity_2m"].shift(1)

    # Rolling feature
    df["humidity_avg_3"] = df["relative_humidity_2m"].rolling(window=3, min_periods=3).mean()

    # Keep only the latest row with complete features
    df = df.dropna(subset=FEATURE_COLS)
    if df.empty:
        return df
    return df.tail(1)


def predict_all():
    """
    For every location: fetch forecast → engineer features → predict.
    Returns a list of dicts with prediction results.
    """
    model = joblib.load(MODEL_PATH)
    results = []

    for name, (lat, lon) in LOCATIONS.items():
        df = fetch_forecast(name, lat, lon)
        if df.empty:
            results.append({"location": name, "prediction": "Error", "details": {}})
            continue

        featured = prepare_features(df)
        if featured.empty:
            results.append({"location": name, "prediction": "Insufficient data", "details": {}})
            continue

        X = featured[FEATURE_COLS]
        pred = int(model.predict(X)[0])

        details = {
            "temperature_2m":       float(featured["temperature_2m"].values[0]),
            "relative_humidity_2m": float(featured["relative_humidity_2m"].values[0]),
            "cloudcover":           float(featured["cloudcover"].values[0]),
            "windspeed_10m":        float(featured["windspeed_10m"].values[0]),
        }

        results.append({
            "location":   name,
            "prediction": "Rain Expected 🌧️" if pred == 1 else "No Rain ☀️",
            "details":    details,
        })

    return results


def main():
    print("=" * 60)
    print(" Hyperlocal Rainfall Prediction – Live Predictions")
    print("=" * 60)

    results = predict_all()

    print(f"\n{'Location':<25} {'Prediction':<20} {'Temp (°C)':<10} {'Humidity (%)':<12}")
    print("-" * 70)
    for r in results:
        temp = r["details"].get("temperature_2m", "N/A")
        hum  = r["details"].get("relative_humidity_2m", "N/A")
        print(f"{r['location']:<25} {r['prediction']:<20} {temp:<10} {hum:<12}")


if __name__ == "__main__":
    main()
