/* EBK · home page — multi-sport marquee + "choose your sport" grid. */
(function () {
  "use strict";

  // ---- all-sports marquee: each league logo leads a run of its team logos
  (function () {
    var strip = document.getElementById("logo-strip");
    if (!strip || !window.EBK || !window.EBKBanner) return;
    var items = [];
    EBK.sports.forEach(function (s) {
      if (!EBK.sportLive(s.key)) return;
      if (s.logo) items.push({ href: "/" + s.key, title: s.name, src: s.logo, big: true });
      items = items.concat(EBKBanner.teamItems(s.key, 5));
    });
    if (items.length) EBKBanner.build(strip, items, "strip-arena");
    else strip.remove();
  })();

  // ---- sports grid
  (function () {
    var grid = document.getElementById("sports-grid");
    if (!grid || !window.EBK) return;
    var liveCount = 0;
    EBK.sports.forEach(function (s) {
      var live = EBK.sportLive(s.key);
      if (live) liveCount++;
      var a = document.createElement("a");
      a.className = "game-card live sport-card";
      a.href = "/" + s.key;
      a.style.setProperty("--accent", s.accent);
      a.innerHTML =
        '<span class="badge ' + (live ? "play" : "soon") + '">' + (live ? "Play" : "Soon") + "</span>" +
        '<span class="card-logo">' + EBK.logoTag(s) + "</span>" +
        '<h3 class="game-title">' + s.name + "</h3>" +
        '<p class="game-desc">' + s.blurb + "</p>" +
        '<span class="game-foot">' + (live ? ((EBK.live[s.key] || []).length + " games live") : "Preview games") + "</span>";
      grid.appendChild(a);
    });
    var c = document.getElementById("sport-count");
    if (c) c.textContent = liveCount + " live · " + (EBK.sports.length - liveCount) + " coming soon";
  })();
})();
