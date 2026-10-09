# Trains the TravelWise cost-prediction model.
#
# Dataset: Kaggle "Flight Price Prediction" by Shubham Bathwal
# https://www.kaggle.com/datasets/shubhambathwal/flight-price-prediction
# ~300k EaseMyTrip flight bookings across India's 6 metro cities, Feb-Mar 2022.
# Prices are in INR (the dataset's native currency) — see README for the
# domain-mismatch note this implies for a South African expense tool.
#
# Usage: python train.py

import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

DATA_PATH = Path(__file__).parent / "data" / "flight_prices.csv"
MODEL_DIR = Path(__file__).parent / "model"
MODEL_DIR.mkdir(exist_ok=True)

# Matches the /predict-cost contract: origin, destination, days_to_departure,
# duration_hours, travel_class -> mapped to this dataset's column names.
FEATURES = ["source_city", "destination_city", "class", "duration", "days_left"]
CATEGORICAL_FEATURES = ["source_city", "destination_city", "class"]
NUMERIC_FEATURES = ["duration", "days_left"]
TARGET = "price"


def main():
    df = pd.read_csv(DATA_PATH)
    df = df[FEATURES + [TARGET]].dropna()

    X = df[FEATURES]
    y = df[TARGET]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    preprocessor = ColumnTransformer(
        [("categorical", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_FEATURES)],
        remainder="passthrough",
    )

    model = Pipeline(
        [
            ("preprocess", preprocessor),
            (
                "regressor",
                RandomForestRegressor(
                    n_estimators=200,
                    max_depth=20,
                    min_samples_leaf=5,
                    random_state=42,
                    n_jobs=-1,
                ),
            ),
        ]
    )

    print(f"Training on {len(X_train)} rows, testing on {len(X_test)} rows...")
    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    r2 = r2_score(y_test, predictions)
    mae = mean_absolute_error(y_test, predictions)

    version = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    joblib.dump(model, MODEL_DIR / "model.joblib", compress=3)

    metrics = {
        "model_version": version,
        "r2_score": round(float(r2), 4),
        "mean_absolute_error": round(float(mae), 2),
        "train_rows": len(X_train),
        "test_rows": len(X_test),
        "total_rows": len(df),
        "features": FEATURES,
        "target": TARGET,
        "currency": "INR",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_source": "https://www.kaggle.com/datasets/shubhambathwal/flight-price-prediction",
    }
    with open(MODEL_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
