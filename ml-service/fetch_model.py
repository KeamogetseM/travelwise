"""Download the trained model from a private GitHub release asset at build
time, so the ~100MB model.joblib never has to live in git history.

Requires GH_TOKEN (a GitHub personal access token with read access to this
repo's contents) set as an environment variable on the deploy platform.
"""

import json
import os
import urllib.request

REPO = "KeamogetseM/travelwise"
TAG = "model-v1"
ASSET_NAME = "model.joblib"
DEST = os.path.join(os.path.dirname(__file__), "model", "model.joblib")


def main():
    if os.path.exists(DEST):
        print(f"{DEST} already present, skipping download")
        return

    token = os.environ.get("GH_TOKEN")
    if not token:
        raise SystemExit("GH_TOKEN environment variable is not set")

    meta_req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/releases/tags/{TAG}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
    )
    with urllib.request.urlopen(meta_req) as resp:
        release = json.load(resp)

    asset = next((a for a in release["assets"] if a["name"] == ASSET_NAME), None)
    if asset is None:
        raise SystemExit(f"No asset named {ASSET_NAME} found on release {TAG}")

    download_req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/releases/assets/{asset['id']}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/octet-stream"},
    )
    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    with urllib.request.urlopen(download_req) as resp, open(DEST, "wb") as f:
        f.write(resp.read())

    print(f"Downloaded {DEST} ({os.path.getsize(DEST)} bytes)")


if __name__ == "__main__":
    main()
