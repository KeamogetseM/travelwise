# TravelWise cost-prediction microservice.
# Exposes POST /predict-cost per the interface contract in the Assignment 2
# spec: {origin, destination, days_to_departure, duration_hours, travel_class}
# -> {predicted_cost, model_version, currency}.
#
# duration_hours is accepted but optional: callers (like the travel-request
# form) generally don't know a flight's actual air time, so if it's omitted
# we derive it from a per-route median built from the training data.

import json
import os
import time
from pathlib import Path

import joblib
import pandas as pd
from flask import Flask, jsonify, request

MODEL_DIR = Path(__file__).parent / "model"

model = joblib.load(MODEL_DIR / "model.joblib")
with open(MODEL_DIR / "metrics.json") as f:
    metrics = json.load(f)
with open(MODEL_DIR / "route_durations.json") as f:
    route_data = json.load(f)

app = Flask(__name__)

REQUIRED_FIELDS = ["origin", "destination", "days_to_departure", "travel_class"]


def resolve_duration(origin, destination, provided):
    if provided:
        return float(provided)
    key = f"{origin}->{destination}"
    return route_data["routes"].get(key, route_data["default_duration"])


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "model_version": metrics["model_version"]})


@app.route("/meta", methods=["GET"])
def meta():
    return jsonify({"cities": route_data["cities"], "classes": route_data["classes"]})


@app.route("/predict-cost", methods=["POST"])
def predict_cost():
    started = time.monotonic()
    body = request.get_json(silent=True) or {}

    missing = [f for f in REQUIRED_FIELDS if not body.get(f) and body.get(f) != 0]
    if missing:
        return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400

    duration_hours = resolve_duration(body["origin"], body["destination"], body.get("duration_hours"))

    row = pd.DataFrame(
        [
            {
                "source_city": body["origin"],
                "destination_city": body["destination"],
                "class": body["travel_class"],
                "duration": duration_hours,
                "days_left": body["days_to_departure"],
            }
        ]
    )

    try:
        prediction = float(model.predict(row)[0])
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {e}"}), 400

    elapsed_ms = round((time.monotonic() - started) * 1000, 1)
    return jsonify(
        {
            "predicted_cost": round(prediction, 2),
            "model_version": metrics["model_version"],
            "currency": metrics["currency"],
            "duration_hours": duration_hours,
            "inference_ms": elapsed_ms,
        }
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8000)))
