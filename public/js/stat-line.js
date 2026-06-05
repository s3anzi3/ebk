/* EBK · Guess the Stat Line — name the player from a mystery season's numbers. */
(() => {
  "use strict";
  const BEST_KEY = "ebk_statline_best_v2"; // v2: score = correct answers (lifeline model)
  const $ = (s, r = document) => r.querySelector(s);

  const DISPLAY = [
    ["passing_yards", "Pass Yds"],
    ["passing_tds", "Pass TD"],
    ["rushing_yards", "Rush Yds"],
    ["rushing_tds", "Rush TD"],
    ["receptions", "Receptions"],
    ["receiving_yards", "Rec Yds"],
    ["receiving_tds", "Rec TD"],
    ["fantasy_points_ppr", "Fantasy (PPR)"],
    ["def_sacks", "Sacks"],
    ["tackles", "Tackles"],
    ["def_interceptions", "Interceptions"],
    ["def_pass_defended", "Passes Def"],
    ["def_fumbles_forced", "Forced Fum"],
  ];
  const dec1 = (k) => k === "def_sacks" || k.startsWith("fantasy");
  const EXACT_REVEALS = 5; // "reveal exact season" lifelines per run
  const RANGE_W = 3;       // season range width: 4 inclusive years (e.g. 2015–2018)
  const MIN_Y = 1999, MAX_Y = 2025;

  const S = {
    players: [], byId: new Map(), posIndex: new Map(), sideIndex: { off: [], def: [] }, notable: [],
    mystery: null, answerId: null, score: 0, best: 0, locked: false,
    exactLeft: EXACT_REVEALS, exactShown: false, range: [MIN_Y, MAX_Y],
  };

  const fmt = (v, d = 0) => Number(v).toLocaleString("en-US", { maximumFractionDigits: d });
  const rand = (a) => a[(Math.random() * a.length) | 0];
  const take = (a) => a.splice((Math.random() * a.length) | 0, 1)[0];
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const OFF_GRP = new Set(["QB", "RB", "WR", "TE"]);
  const sideOf = (g) => (OFF_GRP.has(g) ? "off" : "def");
  const getBest = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; } };
  const setBest = (v) => { try { localStorage.setItem(BEST_KEY, v); } catch {} };

  function isNotable(p) {
    const s = p.stats;
    return (s.fantasy_points_ppr || 0) >= 60 ||
           (s.passing_yards || 0) >= 1200 ||
           (s.rushing_yards || 0) >= 450 ||
           (s.receiving_yards || 0) >= 450 ||
           (s.def_sacks || 0) >= 5 ||
           (s.tackles || 0) >= 75 ||
           (s.def_interceptions || 0) >= 3 ||
           (s.def_fumbles_forced || 0) >= 3 ||
           (s.def_pass_defended || 0) >= 12;
  }

  async function load() {
    try {
      const res = await fetch("/data/players.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      S.players = data.players;
      for (const p of S.players) {
        if (!p.id) continue;
        const grp = p.grp || p.pos;
        let b = S.byId.get(p.id);
        if (!b) { b = { id: p.id, name: p.name, pos: p.pos, grp, min: p.season, max: p.season }; S.byId.set(p.id, b); }
        b.min = Math.min(b.min, p.season); b.max = Math.max(b.max, p.season);
        if (!S.posIndex.has(grp)) S.posIndex.set(grp, new Set());
        S.posIndex.get(grp).add(p.id);
      }
      for (const [grp, set] of S.posIndex) S.posIndex.set(grp, [...set]);
      S.sideIndex = { off: [], def: [] };
      for (const b of S.byId.values()) S.sideIndex[sideOf(b.grp)].push(b);
      S.notable = S.players.filter(isNotable);
      S.best = getBest();
      $("#best").textContent = S.best;
      $("#loading").hidden = true;
      $("#game").hidden = false;
      newRun();
    } catch (e) {
      $("#loading").textContent = "Couldn't load player data. " + e.message;
    }
  }

  function newRun() {
    S.score = 0;
    S.exactLeft = EXACT_REVEALS;
    $("#score").textContent = "0";
    nextRound();
  }

  // A 4-year window guaranteed to contain the true season.
  function seasonRange(season) {
    let lo = season - ((Math.random() * (RANGE_W + 1)) | 0);
    lo = Math.min(Math.max(lo, MIN_Y), MAX_Y - RANGE_W);
    return [lo, lo + RANGE_W];
  }

  // Options stay on the same side of the ball, drawn from ALL players (not just
  // notable). Composition: answer + 2 same-position distractors (era-overlapping)
  // + 1 wildcard of any position from that side. Keeps it from being the easy
  // "1 QB vs 3 non-QBs" giveaway while adding variety.
  function pickOptions(mystery) {
    const grp = mystery.grp || mystery.pos;
    const side = sideOf(grp);
    const samePos = (S.posIndex.get(grp) || []).map((id) => S.byId.get(id)).filter((b) => b.id !== mystery.id);
    const era = samePos.filter((b) => b.max >= mystery.season - 6 && b.min <= mystery.season + 6);
    const samePool = (era.length >= 2 ? era : samePos).slice();

    const picks = [];
    while (picks.length < 2 && samePool.length) picks.push(take(samePool));

    // wildcard: random player, any position, same side
    const sidePool = (S.sideIndex[side] || []).filter((b) => b.id !== mystery.id && !picks.some((x) => x.id === b.id));
    if (sidePool.length) picks.push(take(sidePool));

    // top up if a position pool was tiny
    const fb = samePos.filter((b) => !picks.some((x) => x.id === b.id));
    while (picks.length < 3 && fb.length) picks.push(take(fb));

    const opts = picks.map((b) => ({ id: b.id, name: b.name }));
    opts.push({ id: mystery.id, name: mystery.name });
    return shuffle(opts);
  }

  function nextRound() {
    S.mystery = rand(S.notable);
    S.answerId = S.mystery.id;
    S.exactShown = false;
    S.range = seasonRange(S.mystery.season);
    S.locked = false;
    S.options = pickOptions(S.mystery);
    render();
  }

  function render() {
    const m = S.mystery;
    $("#pos-line").textContent = posName(m.pos);
    $("#team-line").innerHTML = `Team: <img class="tlogo" src="${NFL.logo(m.team)}" alt="" /> ${NFL.name(m.team)}`;
    $("#season-badge").textContent = S.exactShown ? m.season : `Sometime ${S.range[0]}–${S.range[1]}`;

    const rows = [`<div class="s-k">Games</div><div class="s-v">${m.games || "—"}</div>`];
    for (const [k, label] of DISPLAY) {
      if (m.stats[k] == null) continue;
      rows.push(`<div class="s-k">${label}</div><div class="s-v">${fmt(m.stats[k], dec1(k) ? 1 : 0)}</div>`);
    }
    $("#statline").innerHTML = rows.join("");

    $("#lifelines").hidden = false;
    const eb = $("#reveal-exact");
    if (S.exactShown) { eb.disabled = true; eb.textContent = "🎯 exact season shown"; }
    else if (S.exactLeft <= 0) { eb.disabled = true; eb.textContent = "🎯 no exact reveals left"; }
    else { eb.disabled = false; eb.textContent = `🎯 Reveal exact season (${S.exactLeft})`; }

    const ol = $("#options");
    ol.innerHTML = "";
    for (const o of S.options) {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = o.name;
      b.addEventListener("click", () => guess(o.id, b));
      ol.appendChild(b);
    }
    $("#banner").textContent = "";
    $("#banner").className = "banner";
    $("#reveal").hidden = true;
    $("#next-row").hidden = true;
    $("#next-row").innerHTML = "";
  }

  function guess(id, btn) {
    if (S.locked) return;
    S.locked = true;
    const correct = id === S.answerId;
    const m = S.mystery;

    [...$("#options").children].forEach((b, i) => {
      b.disabled = true;
      if (S.options[i].id === S.answerId) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    $("#lifelines").hidden = true;

    const banner = $("#banner");
    if (correct) {
      S.score += 1;
      const sc = $("#score");
      sc.textContent = S.score;
      sc.classList.remove("pop"); void sc.offsetWidth; sc.classList.add("pop");
      if (S.score > S.best) { S.best = S.score; setBest(S.best); $("#best").textContent = S.best; }
      banner.textContent = "Correct!";
      banner.className = "banner good";
      showReveal(m, false);
      addBtn("Next player ›", "primary", nextRound);
    } else {
      banner.textContent = "Wrong!";
      banner.className = "banner bad";
      showReveal(m, true);
      addBtn("New run", "primary", newRun);
    }
    addBtn("Back to EBK", "ghost", () => (location.href = "/"));
  }

  function showReveal(m, ended) {
    const r = $("#reveal");
    const img = m.headshot ? `<img alt="" src="${m.headshot}" />` : "";
    r.innerHTML = `${img}<div class="pr-name">${m.name}</div>` +
      `<div class="pr-meta">${m.season} · ${NFL.name(m.team)} · ${posName(m.pos)}</div>`;
    r.hidden = false;
    $("#season-badge").textContent = m.season;
    $("#team-line").innerHTML = `Team: <img class="tlogo" src="${NFL.logo(m.team)}" alt="" /> ${NFL.name(m.team)}`;
  }

  function addBtn(label, kind, fn) {
    const row = $("#next-row");
    row.hidden = false;
    const b = document.createElement("button");
    b.className = "gbtn " + kind;
    b.textContent = label;
    b.addEventListener("click", fn);
    row.appendChild(b);
  }

  function posName(p) {
    return POS_NAMES[p] || p;
  }
  const POS_NAMES = {
    QB: "Quarterback", RB: "Running Back", FB: "Fullback", HB: "Running Back",
    WR: "Wide Receiver", TE: "Tight End",
    DE: "Defensive End", DT: "Defensive Tackle", NT: "Nose Tackle", DL: "Defensive Lineman", EDGE: "Edge Rusher",
    LB: "Linebacker", OLB: "Outside Linebacker", ILB: "Inside Linebacker", MLB: "Middle Linebacker",
    CB: "Cornerback", S: "Safety", FS: "Free Safety", SS: "Strong Safety", DB: "Defensive Back",
  };

  $("#reveal-exact").addEventListener("click", () => {
    if (S.locked || S.exactShown || S.exactLeft <= 0) return;
    S.exactShown = true; S.exactLeft--;
    render();
  });

  load();
})();
