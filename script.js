/* ==========================================================================
   CV-website — tabbladen & Download CV
   ========================================================================== */
(function () {
  "use strict";

  /* ---- Instellingen -------------------------------------------------------
     CV_MODE:
       "auto"  → probeert cv.pdf; bestaat die niet (of open je de site lokaal
                 via file://), dan opent de printversie (window.print).
       "pdf"   → altijd cv.pdf downloaden (gebruik dit zodra cv.pdf online staat).
       "print" → altijd de printversie openen.
  ------------------------------------------------------------------------- */
  var CV_MODE = "pdf"; // cv.pdf staat in de map, dus altijd de PDF openen/downloaden
  var CV_FILE = "cv.pdf";

  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[role="tabpanel"]'));
  var ids = tabs.map(function (t) { return t.dataset.tab; });
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function activate(id, opts) {
    opts = opts || {};
    if (ids.indexOf(id) === -1) id = ids[0];

    tabs.forEach(function (tab) {
      var on = tab.dataset.tab === id;
      tab.setAttribute("aria-selected", on ? "true" : "false");
      tab.tabIndex = on ? 0 : -1;
      if (on && opts.focus) tab.focus();
      if (on) tab.scrollIntoView({ block: "nearest", inline: "nearest" });
    });

    panels.forEach(function (panel) {
      var on = panel.id === id;
      panel.hidden = !on;
      panel.classList.remove("is-entering");
      if (on && opts.animate && !reduceMotion) {
        void panel.offsetWidth; // herstart animatie
        panel.classList.add("is-entering");
      }
    });

    if (opts.updateHash && location.hash !== "#" + id) {
      history.replaceState(null, "", "#" + id);
    }
    if (opts.scrollTop) window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });

    document.dispatchEvent(new CustomEvent("tab:change", { detail: { id: id, animate: !!opts.animate } }));
  }

  // Klikken op tabs
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      activate(tab.dataset.tab, { updateHash: true, animate: true, scrollTop: true });
    });
  });

  // Toetsenbordnavigatie (pijltjes, Home, End)
  document.querySelector('[role="tablist"]').addEventListener("keydown", function (e) {
    var i = tabs.indexOf(document.activeElement);
    if (i === -1) return;
    var next = null;
    if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next === null) return;
    e.preventDefault();
    activate(ids[next], { focus: true, updateHash: true, animate: true });
  });

  // Links naar een tab (zoals het logo)
  document.querySelectorAll("[data-tab-link]").forEach(function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      activate(link.dataset.tabLink, { updateHash: true, animate: true, scrollTop: true });
    });
  });

  // Deep-links (#werkervaring etc.) en terug/vooruit
  window.addEventListener("hashchange", function () {
    activate(location.hash.slice(1), { animate: true });
  });
  activate(location.hash.slice(1) || ids[0]);

  /* ---- Download CV -------------------------------------------------------- */
  var cvBtn = document.getElementById("download-cv");

  function printCv() {
    // De print-stylesheet toont alle tabbladen onder elkaar op A4.
    window.print();
  }

  function pdfExists() {
    if (location.protocol === "file:") return Promise.resolve(false);
    return fetch(CV_FILE, { method: "HEAD", cache: "no-store" })
      .then(function (r) {
        var type = r.headers.get("content-type") || "";
        return r.ok && type.indexOf("html") === -1; // voorkom 'soft 404'-pagina's
      })
      .catch(function () { return false; });
  }

  function downloadCv() {
    if (CV_MODE === "print") return printCv();
    var go = function () {
      var a = document.createElement("a");
      a.href = CV_FILE;
      a.download = "CV-Dani-van-der-Kruijk.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    if (CV_MODE === "pdf") return go();
    pdfExists().then(function (ok) { ok ? go() : printCv(); });
  }

  if (cvBtn) {
    cvBtn.addEventListener("click", function (e) {
      if (CV_MODE === "pdf") return; // gewone download
      e.preventDefault();
      downloadCv();
    });
  }

  // Beschikbaar voor effects.js (terminal)
  window.CV = { activate: function (id) { activate(id, { updateHash: true, animate: true, scrollTop: true }); }, download: downloadCv, tabs: ids };

  /* ---- Jaartal in footer ------------------------------------------------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
