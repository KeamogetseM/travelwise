// Client for the TravelWise cost-prediction microservice (Python/scikit-learn).
// See ml-service/app.py for the endpoint implementation.

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

async function predictCost({ origin, destination, days_to_departure, travel_class }) {
  const res = await fetch(`${ML_SERVICE_URL}/predict-cost`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin, destination, days_to_departure, travel_class }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Cost prediction failed");
  }
  return data; // { predicted_cost, model_version, currency, duration_hours, inference_ms }
}

module.exports = { predictCost };
