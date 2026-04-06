"""
train.py
========
Loads the historical weather CSV, engineers features, trains a
Random Forest classifier, and saves the model to model/rain_model.pkl.

Feature pipeline (must match predict.py):
  - Target:   rain = 1 if precipitation > 0 else 0
  - Time:     hour, month
  - Lag:      rain_lag1, humidity_lag1     (per location)
  - Rolling:  humidity_avg_3              (per location)
"""

import os
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import joblib

# ---------------------------------------------------------------------------
# Feature list – kept in sync with predict.py
# ---------------------------------------------------------------------------
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

TARGET_COL = "rain"


def load_data(path: str = "data/historical_weather.csv") -> pd.DataFrame:
    """Load the raw historical CSV and parse datetime."""
    df = pd.read_csv(path)
    df["datetime"] = pd.to_datetime(df["datetime"])
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add target variable, time features, lag features, and rolling
    features. All lag/rolling computations are grouped by location.
    """
    # Target variable
    df[TARGET_COL] = (df["precipitation"] > 0).astype(int)

    # Time features
    df["hour"]  = df["datetime"].dt.hour
    df["month"] = df["datetime"].dt.month

    # Sort so lags are chronologically correct per location
    df = df.sort_values(["location", "datetime"]).reset_index(drop=True)

    # Lag & rolling features (grouped by location)
    df["rain_lag1"]      = df.groupby("location")[TARGET_COL].shift(1)
    df["humidity_lag1"]   = df.groupby("location")["relative_humidity_2m"].shift(1)
    df["humidity_avg_3"]  = (
        df.groupby("location")["relative_humidity_2m"]
          .transform(lambda s: s.rolling(window=3, min_periods=3).mean())
    )

    # Drop rows with NaN values created by lag/rolling
    df = df.dropna(subset=FEATURE_COLS).reset_index(drop=True)

    return df


def train_model(df: pd.DataFrame) -> RandomForestClassifier:
    """
    Train a Random Forest classifier on the engineered features and
    report accuracy metrics.
    """
    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    print(f"Training set size : {len(X_train)}")
    print(f"Test set size     : {len(X_test)}")

    model = RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)

    print(f"\n✅ Model Accuracy  : {acc:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=["No Rain", "Rain"]))

    return model


def save_model(model: RandomForestClassifier, path: str = "model/rain_model.pkl"):
    """Persist the trained model to disk."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    joblib.dump(model, path)
    print(f"💾 Model saved to {path}")


def main():
    print("=" * 60)
    print(" Hyperlocal Rainfall Prediction – Model Training")
    print("=" * 60)

    # 1. Load data
    df = load_data()
    print(f"\nLoaded {len(df)} rows from historical data.")

    # 2. Feature engineering
    df = engineer_features(df)
    print(f"After feature engineering: {len(df)} rows.")

    # 3. Train
    model = train_model(df)

    # 4. Save
    save_model(model)


if __name__ == "__main__":
    main()
