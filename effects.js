/* ==========================================================================
   effects.js — de "wauw"-laag
   - Opstartscherm (eenmaal per sessie)
   - Decrypt-effect op koppen
   - Typende rol-rotator en optellende cijfers
   - Schuivende tab-indicator en gefaseerde reveals
   - Spotlight + 3D-tilt op kaarten, magnetische knoppen
   - Interactief blueprint-raster (canvas) met datapakketjes en klik-rimpels
   - Terminal als easter egg (toets `)
   Alles respecteert prefers-reduced-motion.
   ========================================================================== */
(function () {
  "use strict";

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var PALETTE = { blue: "#6798ff", teal: "#3ecfb2", violet: "#a78bfa", amber: "#f5b754", green: "#4ade80" };
  var COLORS = [PALETTE.blue, PALETTE.teal, PALETTE.violet, PALETTE.amber];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ------------------------------------------------------------------------
     1. Decrypt / scramble-effect
     ------------------------------------------------------------------------ */
  var GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+<>/\\{}[]=";

  function scramble(el, opts) {
    if (!el || reduce) return;
    opts = opts || {};
    var finalText = el.dataset.text || el.textContent;
    el.dataset.text = finalText;
    var duration = opts.duration || 900;
    var start = null;
    var chars = finalText.split("");
    var reveal = chars.map(function (_, i) { return (i / chars.length) * duration * 0.75 + rand(0, duration * 0.25); });

    el.setAttribute("aria-label", finalText);
    if (el._scrambleRaf) cancelAnimationFrame(el._scrambleRaf);

    function frame(t) {
      if (!start) start = t;
      var elapsed = t - start;
      var out = "";
      var done = true;
      for (var i = 0; i < chars.length; i++) {
        var ch = chars[i];
        if (ch === " " || elapsed >= reveal[i]) {
          out += esc(ch);
        } else {
          done = false;
          out += '<span class="dud">' + esc(pick(GLYPHS)) + "</span>";
        }
      }
      el.innerHTML = out;
      if (!done) el._scrambleRaf = requestAnimationFrame(frame);
      else { el.textContent = finalText; el.removeAttribute("aria-label"); }
    }
    el._scrambleRaf = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------------------
     2. Rol-rotator (typen / wissen)
     ------------------------------------------------------------------------ */
  function startRotator() {
    var el = $("#role-word");
    if (!el) return;
    var words = [
      { t: "GRC", c: PALETTE.blue },
      { t: "Cloud Security", c: PALETTE.teal },
      { t: "Security Awareness", c: PALETTE.violet },
      { t: "Privacy & AVG", c: PALETTE.amber }
    ];
    if (reduce) {
      el.textContent = "GRC, Cloud Security & Awareness";
      return;
    }
    var w = 0, i = 0, deleting = false;
    function tick() {
      var word = words[w];
      el.style.color = word.c;
      if (!deleting) {
        i++;
        el.textContent = word.t.slice(0, i);
        if (i === word.t.length) { deleting = true; return setTimeout(tick, 1900); }
        return setTimeout(tick, 55 + rand(0, 40));
      }
      i--;
      el.textContent = word.t.slice(0, i);
      if (i === 0) { deleting = false; w = (w + 1) % words.length; return setTimeout(tick, 280); }
      setTimeout(tick, 28);
    }
    tick();
  }

  /* ------------------------------------------------------------------------
     3. Optellende cijfers
     ------------------------------------------------------------------------ */
  function countUp() {
    $$(".stat-num").forEach(function (el, n) {
      var target = parseInt(el.dataset.count, 10) || 0;
      if (el.dataset.since) {
        var p = el.dataset.since.split("-");
        var since = new Date(+p[0], (+p[1] || 1) - 1, 1);
        target = Math.max(1, Math.floor((Date.now() - since) / (365.25 * 864e5)));
      }
      var suffix = el.dataset.suffix || "";
      if (reduce) { el.textContent = target + suffix; return; }
      var dur = 1400, start = null;
      el.textContent = "0" + suffix;
      setTimeout(function () {
        requestAnimationFrame(function step(t) {
          if (!start) start = t;
          var k = Math.min(1, (t - start) / dur);
          var eased = 1 - Math.pow(2, -10 * k);
          el.textContent = Math.round(eased * target) + suffix;
          if (k < 1) requestAnimationFrame(step);
          else el.textContent = target + suffix;
        });
      }, n * 120);
    });
  }

  /* ------------------------------------------------------------------------
     4. Schuivende tab-indicator
     ------------------------------------------------------------------------ */
  var indicator = $(".tab-indicator");
  function moveIndicator() {
    var tab = $('.tab[aria-selected="true"]');
    if (!indicator || !tab) return;
    var c = getComputedStyle(tab).getPropertyValue("--c").trim() || PALETTE.blue;
    var pad = parseFloat(getComputedStyle(tab).paddingLeft) || 0;
    indicator.style.width = (tab.offsetWidth - pad * 2) + "px";
    indicator.style.transform = "translateX(" + (tab.offsetLeft + pad) + "px)";
    indicator.style.setProperty("--ic", c);
  }
  if (indicator) {
    document.documentElement.classList.add("has-indicator");
    moveIndicator();
    requestAnimationFrame(function () { indicator.classList.add("ready"); });
    window.addEventListener("resize", moveIndicator);
    window.addEventListener("orientationchange", function () { setTimeout(moveIndicator, 250); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
  }

  /* ------------------------------------------------------------------------
     5. Gefaseerde reveals bij wisselen van tab
     ------------------------------------------------------------------------ */
  var REVEAL = ".eyebrow, .display, .hero-role, .lead, .stats, .hero .tag-row, .profile-card, .section-title, .section-intro, .card, .timeline-item";

  function revealPanel(panel) {
    if (reduce || !panel) return;
    $$(REVEAL, panel).forEach(function (el, i) {
      if (el.closest(".timeline-item") && !el.classList.contains("timeline-item")) return;
      el.style.setProperty("--d", Math.min(i, 14) * 55 + "ms");
      el.classList.remove("reveal");
      void el.offsetWidth;
      el.classList.add("reveal");
      el.addEventListener("animationend", function clear() {
        el.classList.remove("reveal");
        el.removeEventListener("animationend", clear);
      });
    });
    $$(".section-title, .display", panel).forEach(function (h) { scramble(h, { duration: 700 }); });
  }

  document.addEventListener("tab:change", function (e) {
    moveIndicator();
    if (e.detail && e.detail.animate) revealPanel(document.getElementById(e.detail.id));
  });

  /* ------------------------------------------------------------------------
     6. Spotlight + 3D-tilt op kaarten, magnetische knoppen
     ------------------------------------------------------------------------ */
  if (finePointer && !reduce) {
    $$(".card, .profile-card").forEach(function (card) {
      var raf = null;
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty("--mx", x + "px");
        card.style.setProperty("--my", y + "px");
        card.classList.add("is-lit");
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var max = 5 * Math.min(1, 380 / r.width);
          var rx = ((y / r.height) - 0.5) * -max;
          var ry = ((x / r.width) - 0.5) * max;
          card.style.transform = "perspective(1000px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) + "deg) translateY(-3px)";
        });
      });
      card.addEventListener("pointerleave", function () {
        if (raf) cancelAnimationFrame(raf);
        card.classList.remove("is-lit");
        card.style.transform = "";
      });
    });

    $$(".header-actions .btn, .term-toggle").forEach(function (btn) {
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        btn.style.transform = "translate(" + (dx * 0.18).toFixed(1) + "px," + (dy * 0.3).toFixed(1) + "px)";
      });
      btn.addEventListener("pointerleave", function () { btn.style.transform = ""; });
    });
  }

  /* ------------------------------------------------------------------------
     7. Interactief blueprint-raster
     ------------------------------------------------------------------------ */
  var canvas = $("#grid-canvas");
  var pushBurst = function () {};

  if (canvas && canvas.getContext && !reduce) {
    // Raster-effecten (spotlight, pakketjes, rimpels) alleen met een muis;
    // de zwevende wolkjes en slotjes ook op mobiel.
    var interactive = finePointer;
    if (interactive) document.documentElement.classList.add("has-canvas");
    var ctx = canvas.getContext("2d");
    var CELL = 48, OFF = -0.5; // lijnen vallen op 48k - 1 (zoals de CSS-achtergrond)
    var W = 0, H = 0, DPR = 1;
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };
    var packets = [];
    var ripples = [];
    var last = performance.now();

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", function () { setTimeout(resize, 250); });

    function gx(i) { return i * CELL + OFF; }

    function newPacket(x, y, dir, color) {
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      var d = dir || pick(dirs);
      var cols = Math.ceil(W / CELL), rows = Math.ceil(H / CELL);
      return {
        x: x != null ? x : gx(Math.floor(rand(0, cols))),
        y: y != null ? y : gx(Math.floor(rand(0, rows))),
        dx: d[0], dy: d[1],
        speed: rand(70, 150),
        travelled: 0,
        color: color || pick(COLORS),
        trail: [],
        life: x != null ? 2.2 : Infinity
      };
    }
    var COUNT = Math.round(Math.min(16, Math.max(8, (W * H) / 90000)));
    if (interactive) for (var p = 0; p < COUNT; p++) packets.push(newPacket());

    /* ---- Zwevende wolkjes (cloud) en slotjes (security) ---------------- */
    var CLOUD = new Path2D("M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1 0 8.5Z");
    var LOCK_BODY = new Path2D("M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Z");
    var LOCK_HOLE = new Path2D("M12 15v2.5");
    var SHACKLE = new Path2D("M8 11V8a4 4 0 0 1 8 0v3");
    var floaters = [];
    var lastScroll = window.scrollY;

    function newFloater(anywhere) {
      var depth = rand(0.35, 1);              // dichterbij = groter, sneller, helderder
      var type = Math.random() < 0.5 ? "cloud" : "lock";
      return {
        type: type,
        x: rand(-40, W + 40),
        y: anywhere ? rand(-40, H + 40) : H + rand(40, 120),
        vx: rand(-6, 6) * depth,
        vy: -rand(5, 13) * depth,              // stijgt langzaam op
        size: (type === "cloud" ? rand(30, 50) : rand(20, 34)) * (0.6 + depth * 0.5),
        depth: depth,
        color: pick(COLORS),
        base: rand(0.18, 0.3) * (0.6 + depth * 0.6),
        glow: 0,                               // 0..1, licht op bij de cursor
        open: 1,                               // slotje: 1 = open, 0 = dicht
        phase: rand(0, Math.PI * 2),
        spin: rand(-0.12, 0.12),
        rot: rand(-0.15, 0.15),
        ox: 0, oy: 0,                          // duw-offset van de cursor
        fade: 0                                // fade-in bij verschijnen
      };
    }
    var FCOUNT = Math.round(Math.min(22, Math.max(interactive ? 12 : 7, (W * H) / 70000)));
    for (var f = 0; f < FCOUNT; f++) floaters.push(newFloater(true));

    function drawFloater(fl, t) {
      var bob = Math.sin(t * 0.8 + fl.phase) * 4 * fl.depth;
      var x = fl.x + fl.ox, y = fl.y + fl.oy + bob;
      var s = fl.size / 24;
      var a = Math.min(1, fl.base + fl.glow * 0.75) * fl.fade;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(fl.rot + Math.sin(t * 0.5 + fl.phase) * 0.06);
      ctx.scale(s, s);
      ctx.translate(-12, -14);
      ctx.lineWidth = 1.6 / s;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = hexA(fl.color, a);
      if (fl.glow > 0.05) { ctx.shadowColor = fl.color; ctx.shadowBlur = 14 * fl.glow; }
      if (fl.type === "cloud") {
        ctx.fillStyle = hexA(fl.color, a * 0.08);
        ctx.fill(CLOUD);
        ctx.stroke(CLOUD);
      } else {
        ctx.fillStyle = hexA(fl.color, a * 0.1);
        ctx.fill(LOCK_BODY);
        ctx.stroke(LOCK_BODY);
        ctx.stroke(LOCK_HOLE);
        ctx.save();
        ctx.translate(0, -3 * fl.open);       // beugel omhoog = open
        ctx.stroke(SHACKLE);
        ctx.restore();
      }
      ctx.restore();
    }

    function updateFloaters(dt, t) {
      var sc = window.scrollY, ds = sc - lastScroll;
      lastScroll = sc;
      for (var i = 0; i < floaters.length; i++) {
        var fl = floaters[i];
        fl.x += fl.vx * dt;
        fl.y += fl.vy * dt - ds * 0.25 * fl.depth;   // parallax bij scrollen
        fl.rot += fl.spin * dt * 0.2;
        fl.fade = Math.min(1, fl.fade + dt * 0.5);

        // Reactie op de cursor: oplichten, wegduwen, slotje klikt dicht
        var near = 0;
        if (mouse.active) {
          var dx = fl.x - mouse.x, dy = fl.y - mouse.y;
          var d = Math.hypot(dx, dy), R = 190;
          if (d < R) {
            near = 1 - d / R;
            var push = near * near * 38;
            fl.ox += ((dx / (d || 1)) * push - fl.ox) * 0.12;
            fl.oy += ((dy / (d || 1)) * push - fl.oy) * 0.12;
          }
        }
        if (!near) { fl.ox *= 0.94; fl.oy *= 0.94; }
        fl.glow += (near - fl.glow) * 0.1;
        fl.open += ((near > 0.25 ? 0 : 1) - fl.open) * 0.15;

        // Klik-rimpel geeft een zetje
        for (var r = 0; r < ripples.length; r++) {
          var rp = ripples[r];
          var rd = Math.hypot(fl.x - rp.x, fl.y - rp.y);
          var rad = 30 + rp.t * 520;
          if (Math.abs(rd - rad) < 40) {
            fl.glow = Math.max(fl.glow, 0.9 * (1 - rp.t));
            fl.open = 0;
          }
        }

        if (fl.y < -80 || fl.x < -100 || fl.x > W + 100) {
          floaters[i] = newFloater(false);        // nieuw exemplaar stijgt van onderen op
        } else if (fl.y > H + 160) {
          floaters[i] = newFloater(true);         // (bij omhoog scrollen) zachtjes ergens anders
        }
        drawFloater(fl, t);
      }
    }

    pushBurst = function (x, y, n) {
      var sx = Math.round((x + 0.5) / CELL) * CELL + OFF;
      var sy = Math.round((y + 0.5) / CELL) * CELL + OFF;
      ripples.push({ x: sx, y: sy, t: 0 });
      var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (var i = 0; i < (n || 4); i++) packets.push(newPacket(sx, sy, dirs[i % 4], COLORS[i % 4]));
    };

    if (interactive) window.addEventListener("pointermove", function (e) {
      mouse.tx = e.clientX; mouse.ty = e.clientY;
      if (!mouse.active) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }
    });
    document.addEventListener("pointerleave", function () { mouse.active = false; });
    if (interactive) window.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a, button, input, .terminal, .card, .profile-card")) return;
      pushBurst(e.clientX, e.clientY, 4);
    });

    function gridLines(x0, y0, x1, y1) {
      var i0 = Math.floor(x0 / CELL), i1 = Math.ceil(x1 / CELL);
      var j0 = Math.floor(y0 / CELL), j1 = Math.ceil(y1 / CELL);
      ctx.beginPath();
      for (var i = i0; i <= i1; i++) { ctx.moveTo(gx(i), y0); ctx.lineTo(gx(i), y1); }
      for (var j = j0; j <= j1; j++) { ctx.moveTo(x0, gx(j)); ctx.lineTo(x1, gx(j)); }
      ctx.stroke();
    }

    function draw(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;

      // Cursor-spotlight: het raster licht op rond de muis
      if (mouse.active) {
        mouse.x += (mouse.tx - mouse.x) * 0.18;
        mouse.y += (mouse.ty - mouse.y) * 0.18;
        var R = 240;
        var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R);
        g.addColorStop(0, "rgba(103,152,255,0.55)");
        g.addColorStop(0.5, "rgba(103,152,255,0.18)");
        g.addColorStop(1, "rgba(103,152,255,0)");
        ctx.strokeStyle = g;
        gridLines(mouse.x - R, mouse.y - R, mouse.x + R, mouse.y + R);

        var f = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R * 1.4);
        f.addColorStop(0, "rgba(103,152,255,0.06)");
        f.addColorStop(1, "rgba(103,152,255,0)");
        ctx.fillStyle = f;
        ctx.fillRect(mouse.x - R * 1.4, mouse.y - R * 1.4, R * 2.8, R * 2.8);

        // Kruispunten als kleine nodes
        var i0 = Math.floor((mouse.x - R) / CELL), i1 = Math.ceil((mouse.x + R) / CELL);
        var j0 = Math.floor((mouse.y - R) / CELL), j1 = Math.ceil((mouse.y + R) / CELL);
        for (var i = i0; i <= i1; i++) {
          for (var j = j0; j <= j1; j++) {
            var nx = gx(i), ny = gx(j);
            var d = Math.hypot(nx - mouse.x, ny - mouse.y);
            if (d > R) continue;
            ctx.fillStyle = "rgba(167,199,255," + (0.7 * (1 - d / R)).toFixed(3) + ")";
            ctx.fillRect(nx - 1.5, ny - 1.5, 3, 3);
          }
        }
      }

      // Klik-rimpels
      for (var r = ripples.length - 1; r >= 0; r--) {
        var rp = ripples[r];
        rp.t += dt / 1.1;
        if (rp.t >= 1) { ripples.splice(r, 1); continue; }
        var rad = 30 + rp.t * 520, band = 46;
        ctx.save();
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rad, 0, Math.PI * 2);
        ctx.arc(rp.x, rp.y, Math.max(0, rad - band), 0, Math.PI * 2, true);
        ctx.clip();
        ctx.strokeStyle = "rgba(103,152,255," + (0.65 * (1 - rp.t)).toFixed(3) + ")";
        gridLines(rp.x - rad, rp.y - rad, rp.x + rad, rp.y + rad);
        ctx.restore();
      }

      // Wolkjes en slotjes (achter de pakketjes)
      updateFloaters(dt, now / 1000);

      // Datapakketjes langs de rasterlijnen
      for (var k = packets.length - 1; k >= 0; k--) {
        var pk = packets[k];
        var step = pk.speed * dt;
        pk.x += pk.dx * step; pk.y += pk.dy * step;
        pk.travelled += step;
        pk.trail.unshift([pk.x, pk.y]);
        if (pk.trail.length > 22) pk.trail.pop();
        if (pk.life !== Infinity) pk.life -= dt;

        if (pk.travelled >= CELL) {
          // Snap naar kruispunt en kies soms een nieuwe richting
          pk.x = Math.round((pk.x - OFF) / CELL) * CELL + OFF;
          pk.y = Math.round((pk.y - OFF) / CELL) * CELL + OFF;
          pk.travelled = 0;
          if (Math.random() < 0.3) {
            var t = pk.dx; pk.dx = pk.dy * (Math.random() < 0.5 ? 1 : -1); pk.dy = t * (Math.random() < 0.5 ? 1 : -1);
            if (pk.dx === 0 && pk.dy === 0) pk.dx = 1;
          }
        }

        var out = pk.x < -60 || pk.y < -60 || pk.x > W + 60 || pk.y > H + 60;
        if (out || pk.life <= 0) {
          packets.splice(k, 1);
          if (pk.life === Infinity) packets.push(newPacket());
          continue;
        }

        var alpha = pk.life === Infinity ? 1 : Math.max(0, Math.min(1, pk.life / 0.8));
        for (var s = 1; s < pk.trail.length; s++) {
          ctx.strokeStyle = hexA(pk.color, alpha * 0.5 * (1 - s / pk.trail.length));
          ctx.beginPath();
          ctx.moveTo(pk.trail[s - 1][0], pk.trail[s - 1][1]);
          ctx.lineTo(pk.trail[s][0], pk.trail[s][1]);
          ctx.stroke();
        }
        ctx.save();
        ctx.shadowColor = pk.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = hexA(pk.color, alpha);
        ctx.fillRect(pk.x - 1.5, pk.y - 1.5, 3, 3);
        ctx.restore();
      }

      requestAnimationFrame(draw);
    }

    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a.toFixed(3) + ")";
    }

    requestAnimationFrame(draw);
  } else if (canvas) {
    canvas.remove();
  }

  /* ------------------------------------------------------------------------
     8. Confetti (voor 'sudo hire-dani')
     ------------------------------------------------------------------------ */
  function confetti() {
    if (reduce) return;
    var colors = COLORS.concat(["#F25022", "#7FBA00", "#00A4EF", "#FFB900"]);
    var layer = document.createElement("div");
    layer.className = "confetti";
    document.body.appendChild(layer);
    var cx = window.innerWidth / 2, cy = window.innerHeight * 0.6;
    for (var i = 0; i < 140; i++) {
      var el = document.createElement("i");
      el.style.background = pick(colors);
      el.style.width = rand(5, 9) + "px";
      el.style.height = rand(8, 14) + "px";
      layer.appendChild(el);
      var ang = rand(-Math.PI * 0.95, -Math.PI * 0.05);
      var vel = rand(300, 760);
      var tx = Math.cos(ang) * vel, ty = Math.sin(ang) * vel;
      el.animate([
        { transform: "translate(" + cx + "px," + cy + "px) rotate(0deg)", opacity: 1 },
        { transform: "translate(" + (cx + tx) + "px," + (cy + ty) + "px) rotate(" + rand(180, 540) + "deg)", opacity: 1, offset: 0.45 },
        { transform: "translate(" + (cx + tx * 1.3) + "px," + (cy + ty + 700) + "px) rotate(" + rand(540, 1080) + "deg)", opacity: 0 }
      ], { duration: rand(1800, 2800), easing: "cubic-bezier(.15,.6,.35,1)", fill: "forwards" });
    }
    setTimeout(function () { layer.remove(); }, 3000);
  }

  /* ------------------------------------------------------------------------
     9. Terminal
     ------------------------------------------------------------------------ */
  var term = $("#terminal"), termBody = $("#term-body"), termForm = $("#term-form"),
      termInput = $("#term-input"), termToggle = $("#term-toggle");
  var history = [], hIndex = -1, termGreeted = false, busy = false, session = 0;

  function print(html, cls) {
    var line = document.createElement("div");
    line.className = "term-line" + (cls ? " " + cls : "");
    line.innerHTML = html;
    termBody.appendChild(line);
    termBody.scrollTop = termBody.scrollHeight;
    return line;
  }
  function printLines(lines, delay) {
    busy = true;
    var mySession = session;               // na sluiten/reset niets meer afdrukken
    return lines.reduce(function (p, l) {
      return p.then(function () {
        return new Promise(function (res) {
          setTimeout(function () { if (mySession === session) print(l); res(); }, reduce ? 0 : (delay || 70));
        });
      });
    }, Promise.resolve()).then(function () {
      if (mySession !== session) return false;   // terminal is intussen gesloten
      busy = false;
      return true;
    });
  }

  // Terminal volledig terugzetten naar de beginstand
  function resetTerm() {
    session++;
    busy = false;
    termBody.innerHTML = "";
    termInput.value = "";
    history = [];
    hIndex = -1;
    termGreeted = false;
  }
  var C = function (color, txt) { return '<span style="color:' + color + '">' + txt + "</span>"; };
  var dim = function (txt) { return '<span class="t-dim">' + txt + "</span>"; };

  var SECTIONS = ["over-mij", "werkervaring", "opleiding", "certificaten"];
  var ALIASES = { "about": "over-mij", "overmij": "over-mij", "over": "over-mij", "werk": "werkervaring", "ervaring": "werkervaring",
    "experience": "werkervaring", "opleidingen": "opleiding", "education": "opleiding", "certs": "certificaten", "certificates": "certificaten" };

  var COMMANDS = {
    help: function () {
      return printLines([
        C(PALETTE.blue, "Beschikbare commando's"),
        "  " + C("#fff", "whoami") + "        " + dim("wie is Dani?"),
        "  " + C("#fff", "ls") + "            " + dim("toon de secties"),
        "  " + C("#fff", "cd &lt;sectie&gt;") + "    " + dim("open een tabblad, bijv. cd werkervaring"),
        "  " + C("#fff", "skills") + "        " + dim("kennis en vaardigheden"),
        "  " + C("#fff", "certs") + "         " + dim("certificaten verifiëren"),
        "  " + C("#fff", "contact") + "       " + dim("e-mail en LinkedIn"),
        "  " + C("#fff", "cv") + "            " + dim("download het cv"),
        "  " + C("#fff", "nmap dani") + "     " + dim("scan het profiel"),
        "  " + C("#fff", "clear") + " / " + C("#fff", "exit"),
        dim("  …en misschien werkt er nog iets met sudo.")
      ], 25);
    },
    whoami: function () {
      return printLines([
        C("#fff", "Dani van der Kruijk"),
        "Student HBO AD Information Security " + dim("@ Hogeschool Rotterdam"),
        "Focus: " + C(PALETTE.blue, "GRC") + " · " + C(PALETTE.teal, "Cloud Security") + " · " + C(PALETTE.violet, "Awareness") + " · " + C(PALETTE.amber, "Privacy"),
        "Locatie: Delft, NL — " + C(PALETTE.green, "open voor stage")
      ]);
    },
    ls: function () {
      return printLines([SECTIONS.map(function (s, i) { return C(COLORS[i], s + "/"); }).join("   ")], 0);
    },
    cd: function (args) {
      var t = (args[0] || "").replace(/[\/.~]/g, "").toLowerCase();
      t = ALIASES[t] || t;
      if (!t) return printLines([dim("gebruik: cd &lt;sectie&gt; — probeer 'ls'")], 0);
      if (SECTIONS.indexOf(t) === -1) return printLines([C("#ff7b7b", "cd: " + esc(t) + ": sectie niet gevonden")], 0);
      if (window.CV) window.CV.activate(t);
      return printLines([dim("→ ") + C(COLORS[SECTIONS.indexOf(t)], t) + dim(" geopend")], 0);
    },
    skills: function () {
      return printLines([
        C(PALETTE.blue, "[security & beleid]") + "  security frameworks · risicoanalyses · dreigingsanalyses · privacy/AVG",
        C(PALETTE.teal, "[cloud & it-beheer]") + "   Microsoft 365 · netwerkbeheer · systeembeheer · databases",
        C(PALETTE.violet, "[persoonlijk]") + "        communicatie · presentatie · leiderschap · organisatie",
        C(PALETTE.amber, "[normen]") + "             ISO 27001 · NEN 7510 · NIS2 · AVG/GDPR"
      ]);
    },
    certs: function () {
      return printLines([
        dim("verifying certificates…"),
        "  MS-900  Microsoft 365 Fundamentals                       " + C(PALETTE.green, "[VALID]"),
        "  SC-900  Security, Compliance, and Identity Fundamentals  " + C(PALETTE.green, "[VALID]") + "  " + '<a href="https://www.credly.com/badges/3ec008db-69e6-4b61-b1fd-d5f16d717af0/public_url" target="_blank" rel="noopener noreferrer">credly ↗</a>',
        "  AZ-900  Azure Fundamentals                               " + C(PALETTE.green, "[VALID]") + "  " + '<a href="https://www.credly.com/badges/4b53df80-6d4d-443f-96a0-3e2118f89653/public_url" target="_blank" rel="noopener noreferrer">credly ↗</a>'
      ], 180);
    },
    contact: function () {
      var li = $("#linkedin-link");
      return printLines([
        "mail      " + '<a href="mailto:d.kruijk@outlook.com">d.kruijk@outlook.com</a>',
        "linkedin  " + '<a href="' + esc(li ? li.href : "#") + '" target="_blank" rel="noopener noreferrer">profiel openen ↗</a>',
        "locatie   Delft, NL"
      ]);
    },
    cv: function () {
      if (window.CV) window.CV.download();
      return printLines([dim("cv ophalen… ") + C(PALETTE.green, "OK")], 0);
    },
    nmap: function (args) {
      var target = esc(args[0] || "dani");
      return printLines([
        "Starting Nmap 7.95 ( https://nmap.org )",
        "Nmap scan report for " + target + ".van.der.kruijk " + dim("(127.0.0.1)"),
        dim("Host is up (0.0012s latency)."),
        C("#fff", "PORT       STATE  SERVICE     INFO"),
        "25/tcp     " + C(PALETTE.green, "open") + "   smtp        d.kruijk@outlook.com",
        "443/tcp    " + C(PALETTE.green, "open") + "   linkedin    profiel beschikbaar",
        "27001/tcp  " + C(PALETTE.green, "open") + "   grc         ISO 27001 · NEN 7510 · NIS2 · AVG",
        "365/tcp    " + C(PALETTE.green, "open") + "   cloud       MS-900 · SC-900 · AZ-900",
        "2026/tcp   " + C(PALETTE.green, "open") + "   stage       " + C(PALETTE.amber, "zoekt een stageplek"),
        "",
        "Nmap done: 1 IP address. " + C(PALETTE.green, "0 kwetsbaarheden") + ", " + C(PALETTE.amber, "1 talent") + " gedetecteerd."
      ], 140);
    },
    sudo: function (args) {
      var cmd = args.join(" ").toLowerCase();
      if (/^hire[- ]?dani$/.test(cmd) || cmd === "hire") {
        return printLines([
          "[sudo] wachtwoord voor recruiter: " + dim("••••••••"),
          dim("authenticatie… MFA… compliance-check…"),
          C(PALETTE.green, "✔ Toegang verleend."),
          "Volgende stap: mail naar " + '<a href="mailto:d.kruijk@outlook.com?subject=Stage%20%2F%20kennismaking">d.kruijk@outlook.com</a>'
        ], 380).then(function (ok) { if (ok) confetti(); });
      }
      return printLines([
        "recruiter is not in the sudoers file. " + C(PALETTE.amber, "Dit incident wordt gerapporteerd."),
        dim("hint: sudo hire-dani")
      ], 120);
    },
    rm: function (args) {
      if (args.join(" ").indexOf("-rf") !== -1) {
        return printLines([C("#ff7b7b", "Toegang geweigerd.") + " ISO 27001 A.8.13 zegt: eerst een back-up. 😉"], 0);
      }
      return printLines([dim("rm: niets verwijderd")], 0);
    },
    date: function () { return printLines([new Date().toLocaleString("nl-NL")], 0); },
    echo: function (args) { return printLines([esc(args.join(" "))], 0); },
    history: function () { return printLines(history.slice().reverse().map(function (h, i) { return dim(String(i + 1).padStart(3, " ")) + "  " + esc(h); }), 0); },
    clear: function () { termBody.innerHTML = ""; return Promise.resolve(); },
    exit: function () { closeTerm(); return Promise.resolve(); }
  };
  COMMANDS.about = COMMANDS.whoami;
  COMMANDS.open = COMMANDS.cd;
  COMMANDS.dir = COMMANDS.ls;
  COMMANDS["?"] = COMMANDS.help;

  function run(raw) {
    var input = raw.trim();
    print('<span class="t-ps1">dani@infosec:~$</span> ' + esc(input));
    if (!input) return;
    history.unshift(input); hIndex = -1;
    var parts = input.split(/\s+/);
    var name = parts[0].toLowerCase();
    var fn = COMMANDS[name];
    if (!fn) {
      if (ALIASES[name] || SECTIONS.indexOf(name) !== -1) return COMMANDS.cd([name]);
      return printLines([C("#ff7b7b", "command not found: ") + esc(parts[0]) + dim(" — typ 'help'")], 0);
    }
    return fn(parts.slice(1));
  }

  function openTerm() {
    if (!term) return;
    term.hidden = false;
    termToggle.setAttribute("aria-expanded", "true");
    requestAnimationFrame(function () { term.classList.add("open"); });
    if (!termGreeted) {
      termGreeted = true;
      print(C(PALETTE.blue, "Dani OS") + dim(" v1.0 — beveiligde sessie gestart"));
      print(dim("Typ ") + C("#fff", "help") + dim(" om te beginnen. Tab vult aan, ↑ ↓ voor geschiedenis."));
    }
    setTimeout(function () { termInput.focus(); }, 60);
  }
  function closeTerm() {
    if (!term || term.hidden) return;
    term.classList.remove("open");
    termToggle.setAttribute("aria-expanded", "false");
    resetTerm();
    setTimeout(function () { term.hidden = true; }, reduce ? 0 : 200);
    termToggle.focus({ preventScroll: true });
  }

  if (term) {
    termToggle.addEventListener("click", function () { term.hidden ? openTerm() : closeTerm(); });
    $("#term-close").addEventListener("click", closeTerm);
    term.addEventListener("click", function (e) { if (!e.target.closest("a, button")) termInput.focus(); });

    termForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;
      var v = termInput.value;
      termInput.value = "";
      run(v);
    });

    termInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (hIndex < history.length - 1) { hIndex++; termInput.value = history[hIndex]; }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (hIndex > 0) { hIndex--; termInput.value = history[hIndex]; } else { hIndex = -1; termInput.value = ""; }
      } else if (e.key === "Tab") {
        e.preventDefault();
        var v = termInput.value.toLowerCase();
        var isCd = /^(cd|open) /.test(v);
        var pool = isCd ? SECTIONS.map(function (s) { return v.split(" ")[0] + " " + s; }) : Object.keys(COMMANDS);
        var hit = pool.filter(function (c) { return c.indexOf(v) === 0; });
        if (hit.length === 1) termInput.value = hit[0] + (isCd ? "" : " ");
        else if (hit.length > 1) print(dim(hit.join("   ")));
      } else if (e.key === "Escape") {
        closeTerm();
      } else if (e.key === "l" && e.ctrlKey) {
        e.preventDefault(); termBody.innerHTML = "";
      }
    });

    document.addEventListener("keydown", function (e) {
      var typing = /input|textarea|select/i.test(document.activeElement.tagName) && document.activeElement !== termInput;
      if (typing) return;
      if ((e.key === "`" || (e.key === "k" && (e.ctrlKey || e.metaKey))) && document.activeElement !== termInput) {
        e.preventDefault();
        term.hidden ? openTerm() : closeTerm();
      }
    });
  }

  /* ------------------------------------------------------------------------
     10. Opstartscherm → intro
     ------------------------------------------------------------------------ */
  function intro(animated) {
    var hero = $("#over-mij");
    if (animated && hero && !hero.hidden) revealPanel(hero);
    else if (animated) revealPanel($('[role="tabpanel"]:not([hidden])'));
    startRotator();
    countUp();
  }

  var boot = $("#boot");
  var seen = false;
  try { seen = sessionStorage.getItem("cv-booted") === "1"; } catch (e) { /* storage niet beschikbaar */ }

  if (!boot) {
    intro(!reduce);
  } else if (reduce || seen) {
    boot.remove();
    intro(!reduce);
  } else {
    document.documentElement.classList.add("booting");
    var log = $("#boot-log"), bar = $("#boot-bar"), idEl = $("#boot-id");
    idEl.textContent = "SESSION 0x" + Math.floor(rand(0x1000, 0xffff)).toString(16).toUpperCase();
    var skip = false;
    var ok = function (t) { return '<span class="b-ok">' + t + "</span>"; };
    var LINES = [
      ["init secure_session --tls1.3", ""],
      ["handshake ............................", ok("OK")],
      ["verify cert MS-900 ...................", ok("VALID")],
      ["verify cert SC-900 ...................", ok("VALID")],
      ["verify cert AZ-900 ...................", ok("VALID")],
      ["load controls ISO27001 NEN7510 NIS2 AVG", ok("OK")],
      ["mount /home/dani .....................", ok("OK")]
    ];
    var wait = function (ms) { return new Promise(function (r) { setTimeout(r, skip ? 0 : ms); }); };

    var finish = function () {
      if (boot.classList.contains("done")) return;
      try { sessionStorage.setItem("cv-booted", "1"); } catch (e) { /* negeren */ }
      boot.classList.add("done");
      document.documentElement.classList.remove("booting");
      setTimeout(function () { boot.remove(); }, 750);
      intro(true);
      if (pushBurst) setTimeout(function () { pushBurst(window.innerWidth * 0.3, window.innerHeight * 0.4, 4); }, 200);
    };
    var doSkip = function () { skip = true; };
    boot.addEventListener("click", doSkip);
    window.addEventListener("keydown", doSkip, { once: true });

    (async function () {
      var t0 = 0;
      for (var i = 0; i < LINES.length; i++) {
        var stamp = '<span class="b-dim">[' + (t0 += rand(0.06, 0.14)).toFixed(3).padStart(7, " ") + "]</span> ";
        var line = document.createElement("div");
        log.appendChild(line);
        var text = LINES[i][0];
        for (var c = 1; c <= text.length; c += 3) {
          line.innerHTML = stamp + esc(text.slice(0, c));
          if (!skip) await wait(10);
        }
        line.innerHTML = stamp + esc(text) + " " + LINES[i][1];
        bar.style.width = ((i + 1) / (LINES.length + 1)) * 100 + "%";
        await wait(110);
      }
      var granted = document.createElement("div");
      granted.className = "b-granted";
      granted.innerHTML = "&gt; ACCESS GRANTED<span class=\"caret\"></span>";
      log.appendChild(granted);
      bar.style.width = "100%";
      await wait(650);
      finish();
    })();
  }
})();
