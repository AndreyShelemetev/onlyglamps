#!/usr/bin/env python3
"""Backfill coordinates for already-imported Vsaunah objects.

Reads source URLs, fetches each card, extracts the hidden
`cur_cat_coords` input ("lat,lng"), validates an RF bbox, and emits an
idempotent SQL bundle that sets Latitude/Longitude on GlampingObjects
matched via SourceLinks (SourceName='Vsaunah', SourceUrl=...), only where
coordinates are still NULL (never overrides owner-set values).
"""
import concurrent.futures
import re
import sys
import time
import urllib.request

URLS_FILE = "/tmp/vsaunah_urls.txt"
OUT_SQL = sys.argv[1] if len(sys.argv) > 1 else "deploy/imports/vsaunah-coords-backfill.sql"

COORDS_RX = re.compile(
    r'id=["\']cur_cat_coords["\']\s+value=["\'](-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)["\']',
    re.IGNORECASE,
)
HEADERS = {
    "User-Agent": "OnlyGlampsBot/1.0 (+https://onlyglamps.ru/contacts; importer)",
    "Accept-Language": "ru,en;q=0.5",
}


def fetch_coords(url):
    req = urllib.request.Request(url + "/", headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            html = r.read().decode("utf-8", "ignore")
    except Exception as e:  # noqa: BLE001
        return url, None, f"fetch_error: {e}"
    m = COORDS_RX.search(html)
    if not m:
        return url, None, "no_coords"
    lat, lng = float(m.group(1)), float(m.group(2))
    if not (41 <= lat <= 82) or not (19 <= lng <= 191):
        return url, None, f"out_of_bbox: {lat},{lng}"
    return url, (lat, lng), None


def sql_escape(s):
    return s.replace("'", "''")


def main():
    urls = [u.strip() for u in open(URLS_FILE, encoding="utf-8") if u.strip()]
    results = {}
    errors = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
        futures = {ex.submit(fetch_coords, u): u for u in urls}
        done = 0
        for fut in concurrent.futures.as_completed(futures):
            url, coords, err = fut.result()
            done += 1
            if coords:
                results[url] = coords
            else:
                errors[url] = err
            if done % 50 == 0:
                print(f"  ...{done}/{len(urls)}", file=sys.stderr)

    with open(OUT_SQL, "w", encoding="utf-8") as f:
        f.write("-- OnlyGlamps: backfill Vsaunah object coordinates.\n")
        f.write("-- Idempotent: only fills rows where Latitude/Longitude are still NULL.\n")
        f.write("BEGIN;\n")
        for url, (lat, lng) in sorted(results.items()):
            f.write(
                'UPDATE "GlampingObjects" o '
                f'SET "Latitude" = {lat:.6f}, "Longitude" = {lng:.6f} '
                'FROM "SourceLinks" sl '
                'WHERE sl."ObjectId" = o."Id" '
                "AND sl.\"SourceName\" = 'Vsaunah' "
                f"AND sl.\"SourceUrl\" = '{sql_escape(url)}' "
                'AND o."Latitude" IS NULL AND o."Longitude" IS NULL;\n'
            )
        f.write("COMMIT;\n")

    print(f"OK coords={len(results)} errors={len(errors)} -> {OUT_SQL}", file=sys.stderr)
    if errors:
        sample = list(errors.items())[:8]
        for u, e in sample:
            print(f"  ERR {u} -> {e}", file=sys.stderr)


if __name__ == "__main__":
    main()
