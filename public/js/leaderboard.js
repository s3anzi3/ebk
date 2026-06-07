/* EBK · Leaderboards — top scores per sport + game from Firestore. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var sportSel = $("#sport"), gameSel = $("#game"), board = $("#board"),
      status = $("#status"), metricTh = $("#metric");

  var METRIC = { "higher-lower": "Best streak", "stat-line": "Best score",
                 "career-path": "Best score", "player-grid": "Best (of 9)" };

  function liveSports() { return EBK.sports.filter(function (s) { return EBK.sportLive(s.key); }); }
  function liveGames(sport) {
    return EBK.games.filter(function (g) { return g.slug !== "team" && EBK.isLive(sport, g.slug); });
  }

  function fillSports() {
    sportSel.innerHTML = liveSports().map(function (s) {
      return '<option value="' + s.key + '">' + s.emoji + " " + s.name + "</option>";
    }).join("");
  }
  function fillGames() {
    var sport = sportSel.value;
    gameSel.innerHTML = liveGames(sport).map(function (g) {
      return '<option value="' + g.slug + '">' + g.title + "</option>";
    }).join("");
  }

  function load() {
    var sport = sportSel.value, game = gameSel.value;
    metricTh.textContent = METRIC[game] || "Best";
    board.innerHTML = "";
    status.textContent = "Loading…";
    if (!window.EBKF) { status.textContent = "Connecting…"; return setTimeout(load, 200); }
    EBKF.leaderboard(sport, game, 100).then(function (rows) {
      var me = EBKF.user && EBKF.user.uid;
      if (!rows.length) { status.textContent = "No scores yet — be the first to play!"; return; }
      status.textContent = rows.length + " player" + (rows.length === 1 ? "" : "s");
      board.innerHTML = rows.map(function (r, i) {
        var mine = me && r.uid === me ? ' style="background:rgba(61,220,151,0.12)"' : "";
        return "<tr" + mine + "><td>" + (i + 1) + '</td><td class="pname">' + esc(r.name || "Player") +
          "</td><td>" + (r.best != null ? r.best.toLocaleString() : "—") +
          "</td><td>" + (r.plays || 0) + "</td></tr>";
      }).join("");
    }).catch(function (e) {
      status.textContent = "Leaderboards aren't available yet. " + (e && e.message ? "(" + e.message + ")" : "");
    });
  }
  function esc(s) { return String(s).replace(/[<>&]/g, function (c) { return { "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]; }); }

  fillSports(); fillGames(); load();
  sportSel.addEventListener("change", function () { fillGames(); load(); });
  gameSel.addEventListener("change", load);
  // refresh once auth resolves (to highlight the user's row)
  var t = setInterval(function () { if (window.EBKF && EBKF.onChange) { clearInterval(t); EBKF.onChange(function () { load(); }); } }, 100);
})();
