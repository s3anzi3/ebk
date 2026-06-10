/* EBK · light 3D effects. Pointer-tracked tilt on .game-card for mouse users;
   touch devices get press feedback via CSS (:active) instead. */
(function () {
  "use strict";
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  var MAX = 7; // degrees
  document.addEventListener("pointermove", function (e) {
    var card = e.target.closest && e.target.closest(".game-card.live");
    if (!card) return;
    var r = card.getBoundingClientRect();
    var px = (e.clientX - r.left) / r.width - 0.5;
    var py = (e.clientY - r.top) / r.height - 0.5;
    card.classList.add("tilting");
    card.style.transform =
      "perspective(700px) rotateX(" + (-py * MAX).toFixed(2) + "deg) rotateY(" +
      (px * MAX).toFixed(2) + "deg) translateY(-4px)";
  });
  document.addEventListener("pointerout", function (e) {
    var card = e.target.closest && e.target.closest(".game-card.live");
    if (!card) return;
    if (e.relatedTarget && card.contains(e.relatedTarget)) return;
    card.classList.remove("tilting");
    card.style.transform = "";
  });
})();
