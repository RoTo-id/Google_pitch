#!/usr/bin/env python3
"""Regenerate parkmap/data (coverage summary) by counting real GeoJSON features.

Never hand-type zone counts in the app — this script is the single source of
truth generator. Run it whenever data/regions/*/*.geojson changes (same role
as sync_to_parkmap.py's COVERAGE block used to play, now externalized).

Usage: python scripts/build_coverage_summary.py
Writes: parkmap/assets/data/coverage_summary.json
"""
import json
import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGIONS_DIR = ROOT / "data" / "regions"
OUT_PATH = ROOT / "parkmap" / "assets" / "data" / "coverage_summary.json"


def count_city(geojson_path: Path) -> dict:
    with geojson_path.open(encoding="utf-8") as f:
        data = json.load(f)
    features = data.get("features", [])
    total = len(features)
    known = sum(1 for f in features if (f.get("properties") or {}).get("operator") != "unknown")
    pct = round((known / total * 100), 1) if total else 0.0
    return {"total": total, "known": known, "pct": pct}


def main():
    cities = {}
    for region_dir in sorted(REGIONS_DIR.iterdir()):
        if not region_dir.is_dir():
            continue
        for geojson_path in sorted(region_dir.glob("*.geojson")):
            city_key = geojson_path.stem
            cities[city_key] = {"region": region_dir.name, **count_city(geojson_path)}

    total_zones = sum(c["total"] for c in cities.values())
    total_known = sum(c["known"] for c in cities.values())
    summary = {
        "generated_at": datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "cities": cities,
        "totals": {
            "city_count": len(cities),
            "zone_total": total_zones,
            "zone_known": total_known,
            "pct": round((total_known / total_zones * 100), 1) if total_zones else 0.0,
        },
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH} — {len(cities)} cities, {total_zones} zones total, {total_known} known ({summary['totals']['pct']}%)")


if __name__ == "__main__":
    main()
