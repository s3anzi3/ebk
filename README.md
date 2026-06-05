# EBK — Elite Ball Knowledge

**Play it live: https://eliteballknowledge.web.app**

An endless NFL "higher or lower" streak game built on real player-season stats.
Pick a stat (passing yards, receptions, fantasy points, …), then guess whether each
new player-season is higher or lower than the current one. Right = streak continues
and the challenger becomes the new anchor. Wrong = game over.

EBK is the first game under the **Elite Ball Knowledge** banner — built to branch into
something bigger over time.

The game ships as static files (HTML/CSS/JS + a bundled `players.json`) — no backend
required to play. Firebase Hosting + an optional Firestore leaderboard can come later.

## Data

Stats come from **[nflverse](https://github.com/nflverse/nflverse-data)** — the
`stats_player` release, `stats_player_reg_{year}.csv` files (regular-season totals,
one row per player-season), covering 1999–2025.

`data/build_players.py` downloads those CSVs (caching them under `data/raw/`) and writes
a compact `public/data/players.json`. It uses only the Python standard library — no
`pip install` needed.

**Inclusivity model:** every skill-position player-season (QB/RB/FB/WR/TE) is included —
starters and backups, good or bad. A player-season only joins a stat category when that
stat actually *applied* to them (they threw / ran / were targeted / played), so pools are
deep and full of role players without surfacing irrelevant zeros. Current build: ~15,500
player-seasons, ~3,700 distinct players.

### Rebuild the dataset

```powershell
cd C:\Users\panky\nfl-higher-lower\data
python build_players.py            # full 1999–2025
python build_players.py 2010 2025  # custom season range (inclusive)
```

Stat categories and their eligibility (opportunity column + allowed positions) live in
the `CATEGORIES` list near the top of `build_players.py`.

## Play locally

`fetch()` can't read `players.json` from a `file://` URL, so serve `public/` over HTTP:

```powershell
cd C:\Users\panky\nfl-higher-lower\public
python -m http.server 8000
```

Then open <http://localhost:8000> and play. Use the **▲/▼ buttons** or the
**Up/Down arrow keys**. Best streak per stat is saved in your browser (localStorage).

## Project layout

```
nfl-higher-lower/            # (repo: ebk · site: eliteballknowledge.web.app)
├── data/
│   ├── build_players.py   # nflverse CSV -> players.json
│   └── raw/               # cached downloads (gitignored)
└── public/                # static site root (Firebase Hosting)
    ├── index.html
    ├── css/styles.css
    ├── js/game.js
    └── data/players.json  # bundled dataset
```
