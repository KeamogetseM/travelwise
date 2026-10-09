# Builds a median flight-duration lookup per (source_city, destination_city)
# pair from the training data, and the list of valid cities/classes. Users
# submitting a travel request know the route, not how many hours the flight
# takes — this lets the API derive duration_hours automatically instead of
# asking for it on the form.
#
# Usage: python build_route_lookup.py

import json
from pathlib import Path

import pandas as pd

DATA_PATH = Path(__file__).parent / "data" / "flight_prices.csv"
MODEL_DIR = Path(__file__).parent / "model"
MODEL_DIR.mkdir(exist_ok=True)


def main():
    df = pd.read_csv(DATA_PATH)

    route_durations = (
        df.groupby(["source_city", "destination_city"])["duration"]
        .median()
        .round(2)
        .reset_index()
    )
    lookup = {
        f"{row.source_city}->{row.destination_city}": row.duration
        for row in route_durations.itertuples()
    }

    cities = sorted(set(df["source_city"]) | set(df["destination_city"]))
    classes = sorted(df["class"].unique().tolist())

    with open(MODEL_DIR / "route_durations.json", "w") as f:
        json.dump(
            {"routes": lookup, "cities": cities, "classes": classes, "default_duration": round(df["duration"].median(), 2)},
            f,
            indent=2,
        )

    print(f"{len(lookup)} routes, cities={cities}, classes={classes}")


if __name__ == "__main__":
    main()
