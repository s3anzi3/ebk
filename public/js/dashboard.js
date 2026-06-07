/* EBK · user dashboard — aggregate stats from the user's Firestore scores. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var sportName = {}, sportEmoji = {}, gameName = {};
  (window.EBK ? EBK.sports : []).forEach(function (s) { sportName[s.key] = s.name; sportEmoji[s.key] = s.emoji; });
  (window.EBK ? EBK.games : []).forEach(function (g) { gameName[g.slug] = g.title; });

  $("#signin-cta") && $("#signin-cta").addEventListener("click", function () { window.EBKopenAuth && EBKopenAuth(); });

  function show(id) { ["signedout", "loading", "stats"].forEach(function (x) { $("#" + x).hidden = x !== id; }); }

  function render(rows, user) {
    $("#hello").textContent = "Hey, " + (user.displayName || "Player");
    if (!rows.length) {
      show("stats"); $("#cards").innerHTML = ""; $("#bysport").innerHTML = "";
      $("#gametable").innerHTML = ""; $("#empty").hidden = false;
      $("#subline").textContent = "No games logged yet.";
      return;
    }
    $("#empty").hidden = true;
    var totalPlays = 0, totalScore = 0, best = null, bySport = {};
    rows.forEach(function (r) {
      totalPlays += r.plays || 0; totalScore += r.sumScore || 0;
      if (!best || r.best > best.best) best = r;
      var s = bySport[r.sport] || (bySport[r.sport] = { plays: 0, best: 0, score: 0 });
      s.plays += r.plays || 0; s.best = Math.max(s.best, r.best || 0); s.score += r.sumScore || 0;
    });
    var topSport = Object.keys(bySport).sort(function (a, b) { return bySport[b].plays - bySport[a].plays; })[0];
    var avg = totalPlays ? (totalScore / totalPlays) : 0;

    $("#subline").textContent = "Across " + rows.length + " game mode" + (rows.length === 1 ? "" : "s") + ".";
    $("#cards").innerHTML =
      card(totalPlays.toLocaleString(), "Games played") +
      card(avg.toFixed(1), "Avg score / run") +
      card(best ? best.best.toLocaleString() : "—", "Best run", best ? (gameName[best.game] + " · " + sportName[best.sport]) : "") +
      card(topSport ? sportEmoji[topSport] + " " + sportName[topSport] : "—", "Top sport", topSport ? bySport[topSport].plays + " games" : "");

    $("#bysport").innerHTML = Object.keys(bySport).sort(function (a, b) { return bySport[b].plays - bySport[a].plays; })
      .map(function (k) {
        var s = bySport[k];
        return '<div class="stat-card sportcard"><span class="em">' + (sportEmoji[k] || "") + '</span>' +
          '<div><div class="nm">' + (sportName[k] || k) + '</div>' +
          '<div class="mt">' + s.plays + " games · best " + s.best + "</div></div></div>";
      }).join("");

    $("#gametable").innerHTML = rows.slice().sort(function (a, b) { return (b.best || 0) - (a.best || 0); })
      .map(function (r) {
        var a = r.plays ? (r.sumScore / r.plays).toFixed(1) : "—";
        return "<tr><td>" + (sportEmoji[r.sport] || "") + " " + (sportName[r.sport] || r.sport) +
          "</td><td>" + (gameName[r.game] || r.game) + "</td><td>" + (r.best != null ? r.best.toLocaleString() : "—") +
          "</td><td>" + (r.plays || 0) + "</td><td>" + a + "</td></tr>";
      }).join("");
    show("stats");
  }
  function card(v, k, sub) {
    return '<div class="stat-card"><div class="v">' + v + '</div><div class="k">' + k + "</div>" +
      (sub ? '<div class="sub">' + sub + "</div>" : "") + "</div>";
  }

  function start() {
    if (!(window.EBKF && EBKF.onChange)) return setTimeout(start, 60);
    EBKF.onChange(function (user) {
      if (!user) { show("signedout"); return; }
      show("loading");
      EBKF.myScores().then(function (rows) { render(rows, user); })
        .catch(function () { render([], user); });
    });
  }
  start();
})();
