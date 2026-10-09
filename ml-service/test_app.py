# Tests for the cost-prediction Flask service. Runs against the real
# trained model (no mocking) — consistent with how the rest of the project
# is verified, and it doubles as a regression check that the checked-in
# model/* artifacts still load and predict correctly.
#
# Usage: venv/Scripts/pytest test_app.py -v

import pytest

from app import app as flask_app
from app import resolve_duration, route_data


@pytest.fixture()
def client():
    flask_app.config.update(TESTING=True)
    with flask_app.test_client() as c:
        yield c


def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    body = res.get_json()
    assert body["status"] == "ok"
    assert "model_version" in body


def test_meta_lists_the_six_trained_cities_and_two_classes(client):
    res = client.get("/meta")
    assert res.status_code == 200
    body = res.get_json()
    assert len(body["cities"]) == 6
    assert sorted(body["classes"]) == ["Business", "Economy"]


def test_predict_cost_rejects_missing_required_fields(client):
    res = client.post("/predict-cost", json={"origin": "Delhi"})
    assert res.status_code == 400
    assert "Missing required fields" in res.get_json()["error"]


def test_predict_cost_returns_a_sane_prediction_for_a_known_route(client):
    res = client.post(
        "/predict-cost",
        json={"origin": "Delhi", "destination": "Mumbai", "days_to_departure": 14, "travel_class": "Economy"},
    )
    assert res.status_code == 200
    body = res.get_json()
    assert body["predicted_cost"] > 0
    assert body["currency"] == "INR"
    assert body["duration_hours"] > 0
    assert "model_version" in body


def test_predict_cost_meets_the_etr_02_latency_target(client):
    res = client.post(
        "/predict-cost",
        json={"origin": "Chennai", "destination": "Kolkata", "days_to_departure": 7, "travel_class": "Business"},
    )
    assert res.status_code == 200
    # ETR-02: inference must complete within 500ms.
    assert res.get_json()["inference_ms"] < 500


def test_predict_cost_respects_an_explicitly_provided_duration(client):
    res = client.post(
        "/predict-cost",
        json={
            "origin": "Delhi",
            "destination": "Mumbai",
            "days_to_departure": 14,
            "travel_class": "Economy",
            "duration_hours": 3.5,
        },
    )
    assert res.get_json()["duration_hours"] == 3.5


class TestResolveDuration:
    def test_provided_value_wins_over_the_lookup(self):
        assert resolve_duration("Delhi", "Mumbai", 9.9) == 9.9

    def test_known_route_uses_its_median_from_training_data(self):
        key = "Delhi->Mumbai"
        assert key in route_data["routes"]
        assert resolve_duration("Delhi", "Mumbai", None) == route_data["routes"][key]

    def test_unknown_route_falls_back_to_the_dataset_wide_default(self):
        assert resolve_duration("Nowhere", "Nowhere2", None) == route_data["default_duration"]
