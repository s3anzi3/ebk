/* EBK · Team Study — browse / filter / sort every player-season for a team. */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const fmt = (v, d = 0) => (v == null ? "—" : Number(v).toLocaleString("en-US", { maximumFractionDigits: d }));

  const LABELS = {
    games: "G", passing_yards: "Pass Yds", passing_tds: "Pass TD",
    rushing_yards: "Rush Yds", rushing_tds: "Rush TD", receptions: "Rec",
    receiving_yards: "Rec Yds", receiving_tds: "Rec TD",
    fantasy_points: "Std", fantasy_points_ppr: "PPR",
    def_sacks: "Sacks", tackles: "Tack", def_interceptions: "INT",
    def_pass_defended: "PD", def_fumbles_forced: "FF",
  };
  const DEC1 = new Set(["def_sacks", "fantasy_points", "fantasy_points_ppr"]);

  // stat columns shown per position-group filter
  const COLSETS = {
    all: ["games", "fantasy_points_ppr"],
    QB: ["games", "passing_yards", "passing_tds", "rushing_yards", "rushing_tds", "fantasy_points_ppr"],
    RB: ["games", "rushing_yards", "rushing_tds", "receptions", "receiving_yards", "receiving_tds", "fantasy_points_ppr"],
    WR: ["games", "receptions", "receiving_yards", "receiving_tds", "rushing_yards", "fantasy_points_ppr"],
    TE: ["games", "receptions", "receiving_yards", "receiving_tds", "fantasy_points_ppr"],
    DL: ["games", "def_sacks", "tackles", "def_interceptions", "def_pass_defended", "def_fumbles_forced"],
    LB: ["games", "tackles", "def_sacks", "def_interceptions", "def_pass_defended", "def_fumbles_forced"],
    DB: ["games", "def_interceptions", "def_pass_defended", "tackles", "def_sacks", "def_fumbles_forced"],
  };
  const GROUPS = ["all", "QB", "RB", "WR", "TE", "DL", "LB", "DB"];

  const S = { rows: [], teamKey: "", group: "all", from: 1999, to: 2025, q: "",
              sortKey: "season", sortDir: -1 };

  function val(r, key) {
    if (key === "season") return r.season;
    if (key === "name") return r.name;
    if (key === "pos") return r.pos;
    if (key === "games") return r.games;
    return r.stats[key];
  }

  async function load() {
    S.teamKey = new URLSearchParams(location.search).get("t") || "";
    try {
      const res = await fetch("/data/players.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      S.rows = data.players.filter((p) => NFL.keyOf(p.team) === S.teamKey);
      if (!S.rows.length) { $("#loading").textContent = "Unknown team."; return; }
      const seasons = S.rows.map((r) => r.season);
      S.from = Math.min(...seasons); S.to = Math.max(...seasons);
      buildHead();
      buildControls(Math.min(...seasons), Math.max(...seasons));
      $("#loading").hidden = true;
      $("#content").hidden = false;
      render();
    } catch (e) {
      $("#loading").textContent = "Couldn't load data. " + e.message;
    }
  }

  function buildHead() {
    $("#team-head").innerHTML =
      `<img src="${NFL.logo(S.teamKey)}" alt="" />` +
      `<div><h1>${NFL.name(S.teamKey)}</h1>` +
      `<div class="sub">Every player-season in the EBK pool · 1999–2025</div></div>`;
    document.title = NFL.name(S.teamKey) + " · Team Study · EBK";
  }

  function buildControls(minY, maxY) {
    const chips = $("#pos-chips");
    chips.innerHTML = "";
    GROUPS.forEach((g) => {
      const b = document.createElement("button");
      b.className = "chip-btn" + (g === S.group ? " active" : "");
      b.textContent = g === "all" ? "All" : g;
      b.addEventListener("click", () => {
        S.group = g; S.sortKey = "season"; S.sortDir = -1;
        [...chips.children].forEach((c) => c.classList.remove("active"));
        b.classList.add("active");
        render();
      });
      chips.appendChild(b);
    });

    const from = $("#from"), to = $("#to");
    for (let y = maxY; y >= minY; y--) {
      from.add(new Option(y, y));
      to.add(new Option(y, y));
    }
    from.value = minY; to.value = maxY;
    from.addEventListener("change", () => { S.from = +from.value; if (S.from > S.to) { to.value = from.value; S.to = S.from; } render(); });
    to.addEventListener("change", () => { S.to = +to.value; if (S.to < S.from) { from.value = to.value; S.from = S.to; } render(); });
    $("#search").addEventListener("input", (e) => { S.q = e.target.value.trim().toLowerCase(); render(); });
  }

  function columns() {
    const cols = [{ key: "name", label: "Player", type: "text" }];
    if (S.group === "all") cols.push({ key: "pos", label: "Pos", type: "text" });
    cols.push({ key: "season", label: "Season", type: "num" });
    for (const k of COLSETS[S.group]) cols.push({ key: k, label: LABELS[k], type: "num", dec: DEC1.has(k) ? 1 : 0 });
    return cols;
  }

  function filtered() {
    return S.rows.filter((r) =>
      r.season >= S.from && r.season <= S.to &&
      (S.group === "all" || r.grp === S.group) &&
      (!S.q || r.name.toLowerCase().includes(S.q)));
  }

  function sortRows(rows) {
    const k = S.sortKey, dir = S.sortDir;
    return rows.sort((a, b) => {
      let va = val(a, k), vb = val(b, k);
      if (typeof va === "string" || typeof vb === "string") {
        return dir * String(va ?? "").localeCompare(String(vb ?? ""));
      }
      va = va == null ? -Infinity : va; vb = vb == null ? -Infinity : vb;
      if (va === vb) return a.season - b.season; // stable-ish tiebreak
      return dir * (va - vb);
    });
  }

  function render() {
    const cols = columns();
    const thead = $("#thead");
    thead.innerHTML = "<tr>" + cols.map((c) => {
      const cls = c.key === S.sortKey ? (S.sortDir > 0 ? "sort-asc" : "sort-desc") : "";
      return `<th class="${cls}" data-k="${c.key}">${c.label}</th>`;
    }).join("") + "</tr>";
    [...thead.querySelectorAll("th")].forEach((th) => {
      th.addEventListener("click", () => {
        const k = th.dataset.k;
        if (S.sortKey === k) S.sortDir = -S.sortDir;
        else { S.sortKey = k; S.sortDir = (k === "name") ? 1 : -1; }
        render();
      });
    });

    const rows = sortRows(filtered());
    $("#count").textContent = `${rows.length.toLocaleString()} player-season${rows.length === 1 ? "" : "s"}`;
    const tbody = $("#tbody");
    if (!rows.length) { tbody.innerHTML = `<tr><td class="empty" colspan="${cols.length}">No players match these filters.</td></tr>`; return; }
    tbody.innerHTML = rows.map((r) =>
      "<tr>" + cols.map((c) => {
        if (c.key === "name") return `<td><span class="pname">${r.name}</span></td>`;
        if (c.key === "pos") return `<td class="ppos">${r.pos}</td>`;
        if (c.key === "season") return `<td>${r.season}</td>`;
        return `<td>${fmt(val(r, c.key), c.dec)}</td>`;
      }).join("") + "</tr>"
    ).join("");
  }

  load();
})();
