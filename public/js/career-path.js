/* EBK · Career Path — all clues shown as facts; name the player. */
(() => {
  "use strict";
  const BEST_KEY = "ebk_careerpath_best_v2"; // v2: facts model, score = correct
  const POS_REVEALS = 5;                      // "reveal position" lifelines per run
  const $ = (s, r = document) => r.querySelector(s);
  const rand = (a) => a[(Math.random() * a.length) | 0];
  const getBest = () => { try { return +localStorage.getItem(BEST_KEY) || 0; } catch { return 0; } };
  const setBest = (v) => { try { localStorage.setItem(BEST_KEY, v); } catch {} };

  const S = {
    careers: new Map(), pool: [],
    mystery: null, options: [], posShown: false, posLeft: POS_REVEALS,
    score: 0, best: 0, locked: false,
  };

  function isNotable(s) {
    return (s.fantasy_points_ppr || 0) >= 60 || (s.passing_yards || 0) >= 1200 ||
           (s.rushing_yards || 0) >= 450 || (s.receiving_yards || 0) >= 450;
  }
  function posName(p) {
    return { QB: "Quarterback", RB: "Running Back", FB: "Fullback", HB: "Running Back", WR: "Wide Receiver", TE: "Tight End" }[p] || p;
  }

  async function load() {
    try {
      const res = await fetch("/data/players.json", { cache: "no-cache" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      const people = data.people || {};

      for (const p of data.players) {
        if (!p.id) continue;
        let c = S.careers.get(p.id);
        if (!c) {
          const bio = people[p.id] || {};
          c = { id: p.id, name: p.name, pos: p.pos, headshot: p.headshot,
                college: bio.college || "", dy: bio.draftYear, dr: bio.draftRound,
                dp: bio.draftPick, dt: bio.draftTeam || "", years: new Map(), notable: false };
          S.careers.set(p.id, c);
        }
        c.years.set(p.season, p.team);
        if (p.headshot && !c.headshot) c.headshot = p.headshot;
        if (isNotable(p.stats)) c.notable = true;
      }

      for (const c of S.careers.values()) {
        if (!c.notable) continue;
        const yrs = [...c.years.keys()].sort((a, b) => a - b);
        c.min = yrs[0]; c.max = yrs[yrs.length - 1]; c.count = yrs.length;
        const path = [];
        for (const y of yrs) { const k = NFL.keyOf(c.years.get(y)); if (path[path.length - 1] !== k) path.push(k); }
        c.path = path;
        S.pool.push(c);
      }

      S.best = getBest();
      $("#best").textContent = S.best;
      $("#loading").hidden = true;
      $("#game").hidden = false;
      newRun();
    } catch (e) {
      $("#loading").textContent = "Couldn't load player data. " + e.message;
    }
  }

  function facts(c, posShown) {
    const draft = c.dy
      ? `${c.dy} · Round ${c.dr || "?"} · Pick ${c.dp || "?"}${c.dt ? " (" + NFL.name(c.dt) + ")" : ""}`
      : "Undrafted";
    return [
      { icon: "🏈", k: "Position", v: posShown ? posName(c.pos) : "hidden — use a reveal", locked: !posShown },
      { icon: "🎟️", k: "Draft", v: draft },
      { icon: "🎓", k: "College", v: c.college || "Unknown" },
      { icon: "📅", k: "Career", v: `${c.min}–${c.max} · ${c.count} season${c.count > 1 ? "s" : ""}` },
      { icon: "🧭", k: "Team path", v: c.path.map((k) => NFL.name(k)).join("  →  ") },
    ];
  }

  // 4 mixed-position options, era-overlapping, including the answer.
  function pickOptions(c) {
    const era = S.pool.filter((o) => o.id !== c.id && o.max >= c.min - 8 && o.min <= c.max + 8);
    const pool = (era.length >= 3 ? era : S.pool.filter((o) => o.id !== c.id)).slice();
    const picks = [];
    while (picks.length < 3 && pool.length) picks.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
    const opts = picks.map((o) => ({ id: o.id, name: o.name }));
    opts.push({ id: c.id, name: c.name });
    for (let i = opts.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [opts[i], opts[j]] = [opts[j], opts[i]]; }
    return opts;
  }

  function newRun() {
    S.score = 0; S.posLeft = POS_REVEALS;
    $("#score").textContent = "0";
    nextRound();
  }

  function nextRound() {
    S.mystery = rand(S.pool);
    S.posShown = false;
    S.options = pickOptions(S.mystery);
    S.locked = false;
    $("#banner").textContent = ""; $("#banner").className = "banner";
    $("#reveal").hidden = true;
    $("#next-row").hidden = true; $("#next-row").innerHTML = "";
    render();
  }

  function render() {
    const cl = $("#facts");
    cl.innerHTML = "";
    for (const f of facts(S.mystery, S.posShown)) {
      const div = document.createElement("div");
      div.className = "clue" + (f.locked ? " locked" : "");
      div.innerHTML = `<span class="c-icon">${f.locked ? "🔒" : f.icon}</span>` +
        `<div><div class="c-k">${f.k}</div><div class="c-v">${f.v}</div></div>`;
      cl.appendChild(div);
    }

    $("#lifelines").hidden = S.locked;
    const pb = $("#reveal-pos");
    if (S.posShown) { pb.disabled = true; pb.textContent = "🏈 position shown"; }
    else if (S.posLeft <= 0) { pb.disabled = true; pb.textContent = "🏈 no position reveals left"; }
    else { pb.disabled = false; pb.textContent = `🏈 Reveal position (${S.posLeft})`; }

    const ol = $("#options");
    ol.innerHTML = "";
    S.options.forEach((o) => {
      const b = document.createElement("button");
      b.className = "opt";
      b.textContent = o.name;
      if (S.locked) {
        b.disabled = true;
        if (o.id === S.mystery.id) b.classList.add("correct");
      } else {
        b.addEventListener("click", () => guess(o.id, b));
      }
      ol.appendChild(b);
    });
  }

  function guess(id, btn) {
    if (S.locked) return;
    S.locked = true;
    const c = S.mystery;
    const correct = id === c.id;

    [...$("#options").children].forEach((b, i) => {
      b.disabled = true;
      if (S.options[i].id === c.id) b.classList.add("correct");
      else if (b === btn) b.classList.add("wrong");
    });
    $("#lifelines").hidden = true;

    const banner = $("#banner");
    if (correct) {
      S.score += 1;
      const sc = $("#score"); sc.textContent = S.score;
      sc.classList.remove("pop"); void sc.offsetWidth; sc.classList.add("pop");
      if (S.score > S.best) { S.best = S.score; setBest(S.best); $("#best").textContent = S.best; }
      banner.textContent = "Correct!"; banner.className = "banner good";
      showReveal(c);
      addBtn("Next player ›", "primary", nextRound);
    } else {
      banner.textContent = "Wrong!"; banner.className = "banner bad";
      showReveal(c);
      addBtn("New run", "primary", newRun);
    }
    addBtn("Back to EBK", "ghost", () => (location.href = "/"));
  }

  function showReveal(c) {
    const r = $("#reveal");
    const img = c.headshot ? `<img alt="" src="${c.headshot}" />` : "";
    r.innerHTML = `${img}<div class="pr-name">${c.name}</div>` +
      `<div class="pr-meta">${posName(c.pos)} · ${c.college || "—"} · ${c.min}–${c.max}</div>`;
    r.hidden = false;
  }

  function addBtn(label, kind, fn) {
    const row = $("#next-row"); row.hidden = false;
    const b = document.createElement("button");
    b.className = "gbtn " + kind; b.textContent = label;
    b.addEventListener("click", fn); row.appendChild(b);
  }

  $("#reveal-pos").addEventListener("click", () => {
    if (S.locked || S.posShown || S.posLeft <= 0) return;
    S.posShown = true; S.posLeft--;
    render();
  });

  load();
})();
