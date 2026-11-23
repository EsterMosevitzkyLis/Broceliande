"""Pull the game data from the published Google Sheets into data/ (M2j sec. 5, M5a sec. 1.1).

Reads data/sheet_sources.json and downloads every tab's published CSV:
  - the main sheet (publishedId, tabs) into data/<tab>.csv;
  - the Broceliande Narrative sheet (narrative.publishedId, narrative.tabs) into data/narrative/<tab>.csv.
Python 3, standard library only. Touches no other files. If any tab fails, nothing is written, so
data/ never ends up half old and half new. A sheet whose publishedId or gids are still placeholders
is skipped with a note (the other one is still pulled).

Run from anywhere:  python tools/pull_sheet.py   (or double-click tools/pull_sheet.bat)
Google can take a few minutes to refresh the published data after an edit.
"""

import csv
import io
import json
import sys
import urllib.request
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
URL = "https://docs.google.com/spreadsheets/d/e/{published_id}/pub?gid={gid}&single=true&output=csv"
# Tabs the game no longer reads, never fetched even if still listed (M4a: candidate spots now live
# in each level's map file, data/maps/<id>.json).
RETIRED = {"candidates"}


TRIES = 3  # Google's published CSVs sometimes time out at random: try a tab this often


def fetch(url):
    for attempt in range(TRIES):
        try:
            with urllib.request.urlopen(url, timeout=30) as res:
                return res.read().decode("utf-8-sig")
        except (TimeoutError, OSError):
            if attempt == TRIES - 1:
                raise


def download(url):
    text = fetch(url)
    # An unpublished sheet answers with a sign-in page rather than an HTTP error.
    if text.lstrip().startswith("<"):
        raise ValueError("got a web page, not CSV")
    # Every CSV is written the same way (main and narrative): LF line endings and a final newline
    # (Google's export has none), so a pull only changes files whose content changed.
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    return text if text.endswith("\n") else text + "\n"


def data_rows(text):
    # Rows after the header, skipping blank rows (as the game does).
    rows = list(csv.reader(io.StringIO(text)))[1:]
    return sum(1 for r in rows if any(cell.strip() for cell in r))


def is_placeholder(published_id, tabs):
    # Not set up yet: no published ID, the placeholder text, or a tab without a gid.
    return (not published_id or published_id.startswith("PASTE")
            or any(not isinstance(gid, int) for gid in tabs.values()))


def main():
    try:
        sources = json.loads((DATA / "sheet_sources.json").read_text(encoding="utf-8"))
        sheets = [("main sheet", sources["publishedId"], sources["tabs"], DATA)]
        narrative = sources.get("narrative")
        if narrative:
            sheets.append(("Narrative sheet", narrative["publishedId"], narrative["tabs"], DATA / "narrative"))
    except (OSError, ValueError, KeyError) as err:
        print(f"Could not read data/sheet_sources.json: {err}")
        return 1

    pulled, failed = [], []
    for label, published_id, tabs, folder in sheets:
        print(f"-- {label} --")
        if is_placeholder(published_id, tabs):
            print(f"skipped: its publishedId or gids in data/sheet_sources.json are not filled in yet")
            print()
            continue
        for tab, gid in tabs.items():
            name = f"{tab}.csv"
            if tab in RETIRED:
                print(f"{name:<16} -  retired, skipped (remove it from data/sheet_sources.json)")
                continue
            try:
                text = download(URL.format(published_id=published_id, gid=gid))
            except Exception as err:  # network, HTTP or content error: report it and carry on
                print(f"{name:<16} ✗  {err}")
                failed.append(f"{label} {tab}")
                continue
            pulled.append((folder / name, text))
            print(f"{name:<16} ✓  {data_rows(text)} rows")
        print()

    if failed:
        print(f"Failed: {', '.join(failed)}. Nothing was written.")
        print("Check that the sheet is published (File > Share > Publish to web) and that the")
        print("tab gids in data/sheet_sources.json match the sheet's tabs.")
        return 1

    for path, text in pulled:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8", newline="\n")
    print(f"Wrote {len(pulled)} tabs to data/. Commit them when you're happy.")
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")  # the ✓ / ✗ marks in a Windows console
    sys.exit(main())
