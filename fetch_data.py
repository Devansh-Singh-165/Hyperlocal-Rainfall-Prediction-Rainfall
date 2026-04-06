"""
fetch_data.py
=============
Fetches historical hourly weather data for 15 Bangalore micro-locations
from the Open-Meteo Archive API (full year 2023).

Parameters collected:
  - temperature_2m
  - relative_humidity_2m
  - precipitation
  - cloudcover
  - windspeed_10m

Output:
  data/historical_weather.csv
"""

import os
import time
import requests
import pandas as pd

# ---------------------------------------------------------------------------
# Bangalore micro-locations (latitude, longitude)
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

# Open-Meteo Archive API endpoint
ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

# Weather parameters to fetch
HOURLY_PARAMS = [
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "cloudcover",
    "windspeed_10m",
]

# Date range – full year 2023
START_DATE = "2023-01-01"
END_DATE   = "2023-12-31"


def fetch_location_data(name: str, lat: float, lon: float) -> pd.DataFrame:
    """
    Fetch historical hourly weather data for a single location from
    the Open-Meteo Archive API.

    Parameters
    ----------
    name : str
        Human-readable location name.
    lat : float
        Latitude of the location.
    lon : float
        Longitude of the location.

    Returns
    -------
    pd.DataFrame
        DataFrame with hourly weather data and a 'location' column.
    """
    params = {
        "latitude":  lat,
        "longitude": lon,
        "start_date": START_DATE,
        "end_date":   END_DATE,
        "hourly":     ",".join(HOURLY_PARAMS),
        "timezone":   "Asia/Kolkata",
    }

    print(f"  Fetching data for {name} ({lat}, {lon}) ...")

    try:
        response = requests.get(ARCHIVE_URL, params=params, timeout=30)
        response.raise_for_status()
    except requests.exceptions.RequestException as exc:
        print(f"  ⚠ Error fetching {name}: {exc}")
        return pd.DataFrame()

    data = response.json()

    # Build a DataFrame from the hourly block
    hourly = data.get("hourly", {})
    df = pd.DataFrame({
        "datetime":             hourly.get("time", []),
        "temperature_2m":       hourly.get("temperature_2m", []),
        "relative_humidity_2m": hourly.get("relative_humidity_2m", []),
        "precipitation":        hourly.get("precipitation", []),
        "cloudcover":           hourly.get("cloudcover", []),
        "windspeed_10m":        hourly.get("windspeed_10m", []),
    })
    df["location"] = name
    return df


def main():
    """
    Iterate over all locations, fetch data, combine, and save to CSV.
    """
    all_frames = []

    for name, (lat, lon) in LOCATIONS.items():
        df = fetch_location_data(name, lat, lon)
        if not df.empty:
            all_frames.append(df)
        # Polite pause to avoid rate-limiting
        time.sleep(1)

    if not all_frames:
        print("❌ No data was fetched. Check your internet connection.")
        return

    combined = pd.concat(all_frames, ignore_index=True)

    # Ensure output directory exists
    os.makedirs("data", exist_ok=True)
    output_path = os.path.join("data", "historical_weather.csv")
    combined.to_csv(output_path, index=False)

    print(f"\n✅ Saved {len(combined)} rows to {output_path}")
    print(f"   Locations: {combined['location'].nunique()}")
    print(f"   Date range: {combined['datetime'].min()} → {combined['datetime'].max()}")


if __name__ == "__main__":
    main()
