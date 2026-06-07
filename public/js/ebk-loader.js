/* EBK · branded preloader. Covers the page until assets finish loading, then
   fades out. Shows once per browser session so internal navigation is instant. */
(function () {
  "use strict";
  try { if (sessionStorage.getItem("ebk_seen")) return; } catch (e) {}

  var MIN = 500, MAX = 7000, start = Date.now();
  var css =
    '#ebk-load{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;' +
    'align-items:center;justify-content:center;gap:20px;' +
    'background:radial-gradient(120% 80% at 50% -20%,#121a32,#0a0e1c 60%);' +
    'opacity:1;transition:opacity .45s ease;}' +
    '#ebk-load.ebk-hide{opacity:0;pointer-events:none;}' +
    '#ebk-load .wm{font-family:"Segoe UI",system-ui,-apple-system,Arial,sans-serif;font-weight:900;' +
    'font-size:clamp(2.6rem,9vw,4.4rem);letter-spacing:-.03em;color:#f3f6ff;line-height:1;}' +
    '#ebk-load .wm b{color:#3ddc97;}' +
    '#ebk-load .ring{width:40px;height:40px;border-radius:50%;border:3px solid rgba(255,255,255,.15);' +
    'border-top-color:#3ddc97;animation:ebkspin .8s linear infinite;}' +
    '#ebk-load .sub{font-family:"Segoe UI",system-ui,sans-serif;color:#9aa6cc;font-size:.72rem;' +
    'letter-spacing:.28em;text-transform:uppercase;}' +
    '@keyframes ebkspin{to{transform:rotate(360deg);}}' +
    '@media (prefers-reduced-motion:reduce){#ebk-load .ring{animation:none;}}';

  var st = document.createElement("style");
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  var o = document.createElement("div");
  o.id = "ebk-load";
  o.setAttribute("aria-hidden", "true");
  o.innerHTML = '<div class="wm">E<b>B</b>K</div><div class="ring"></div><div class="sub">Elite Ball Knowledge</div>';
  (document.body || document.documentElement).appendChild(o);

  function intoBody() { if (document.body && o.parentNode !== document.body) document.body.appendChild(o); }
  document.addEventListener("DOMContentLoaded", intoBody);

  var done = false;
  function hide() {
    if (done) return; done = true;
    intoBody();
    try { sessionStorage.setItem("ebk_seen", "1"); } catch (e) {}
    var wait = Math.max(0, MIN - (Date.now() - start));
    setTimeout(function () {
      o.classList.add("ebk-hide");
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 500);
    }, wait);
  }

  if (document.readyState === "complete") hide();
  else window.addEventListener("load", hide);
  setTimeout(hide, MAX); // safety net
})();
