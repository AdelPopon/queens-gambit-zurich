/* ==========================================================================
   Queen's Gambit Zürich · site behaviour · v1
   1. Links from config      4. Upcoming events
   2. Mobile navigation      5. Copy email
   3. Header state           6. Toast
   No dependencies. Content lives in data/config.js and data/events.js.
   ========================================================================== */
(function () {
  "use strict";

  var CONFIG = window.QGZ_CONFIG || { links: {}, contact: {} };
  var EVENTS = window.QGZ_EVENTS || [];
  var INITIAL_EVENTS = 6;

  /* ---------- 6. Toast ---------- */
  var toastEl = document.querySelector("[data-toast]");
  var toastTimer;
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 3200);
  }

  /* ---------- 1. Links from config ----------
     data-link="key"            URL comes from QGZ_CONFIG.links[key]
     data-fallback-href="#id"   used when the URL is not set (optional)
     data-fallback-label="…"    button text for the fallback (optional)
     Without a URL or fallback, the element is hidden, together with its
     closest [data-link-group]. A [data-hide-if-empty] container is hidden
     when all its [data-link-group] children are hidden. */
  function applyLink(el) {
    var key = el.getAttribute("data-link");
    var url = CONFIG.links && CONFIG.links[key];
    var fallback = el.getAttribute("data-fallback-href");

    if (url) {
      el.setAttribute("href", url);
      if (/^https?:/i.test(url)) {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener");
      }
      el.hidden = false;
    } else if (fallback) {
      el.setAttribute("href", fallback);
      var label = el.getAttribute("data-fallback-label");
      if (label) el.textContent = label;
    } else {
      var group = el.closest("[data-link-group]");
      (group || el).hidden = true;
    }
  }
  document.querySelectorAll("[data-link]").forEach(applyLink);

  document.querySelectorAll("[data-hide-if-empty]").forEach(function (box) {
    var groups = box.querySelectorAll("[data-link-group]");
    var anyVisible = Array.prototype.some.call(groups, function (g) { return !g.hidden; });
    box.hidden = !anyVisible;
  });

  if (CONFIG.contact && CONFIG.contact.email) {
    document.querySelectorAll("[data-contact-email]").forEach(function (el) {
      el.textContent = CONFIG.contact.email;
    });
  }

  /* ---------- 2. Mobile navigation ---------- */
  var toggle = document.querySelector(".site-nav__toggle");
  var navList = document.getElementById("site-nav-list");

  function setNav(open) {
    if (!toggle || !navList) return;
    toggle.setAttribute("aria-expanded", String(open));
    navList.classList.toggle("is-open", open);
    toggle.querySelector(".site-nav__toggle-label").textContent = open ? "Close" : "Menu";
  }
  if (toggle && navList) {
    toggle.addEventListener("click", function () {
      setNav(toggle.getAttribute("aria-expanded") !== "true");
    });
    navList.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setNav(false);
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function () { setNav(false); });
  }

  /* ---------- 3. Header state ---------- */
  var header = document.querySelector(".site-header");
  var kidsSection = document.getElementById("kids");
  var qgzLogo = document.querySelector(".brand__logo");
  var kidsLogo = document.querySelector(".brand__kids");

  // Show exactly one header logo: Kids Chess logo inside #kids, QGZ logo elsewhere.
  function setKidsLogo(active) {
    header.classList.toggle("is-kids", active);
    if (qgzLogo && qgzLogo.hidden !== active) qgzLogo.hidden = active;
    if (kidsLogo && kidsLogo.hidden !== !active) kidsLogo.hidden = !active;
  }
  var ticking = false;

  // Kids Chess logo is shown while the #kids section sits directly under the header.
  function updateHeader() {
    ticking = false;
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 8);
    if (kidsSection) {
      // Detection line sits just below the gap anchor links leave under the header (scroll-padding-top).
      var line = header.getBoundingClientRect().bottom + 32;
      var r = kidsSection.getBoundingClientRect();
      setKidsLogo(r.top <= line && r.bottom > line);
    }
  }
  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(updateHeader); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("hashchange", onScroll);
  updateHeader();

  /* ---------- 4. Upcoming events ---------- */
  var PROGRAMMES = { community: "Community", kids: "Kids Chess", impact: "Social Impact" };
  var STATUSES = {
    "upcoming-pilot": { label: "Upcoming pilot", cls: "status--pilot" },
    "in-development": { label: "In development", cls: "status--dev" },
    "planned": { label: "Planned", cls: "status--planned" }
  };

  // Parse "YYYY-MM-DD" as a local calendar date (avoids timezone shifts).
  function parseDate(iso) {
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function startOfToday() {
    var d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  function fmt(date, opts) { return date.toLocaleDateString("en-GB", opts); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function prepare(events, today) {
    return events
      .map(function (ev) {
        var dates = ev.sessions.map(function (s) { return parseDate(s.date); });
        var upcoming = dates.filter(function (d) { return d >= today; });
        return { ev: ev, last: dates[dates.length - 1], next: upcoming[0] || null };
      })
      .filter(function (x) { return x.next; })
      .sort(function (a, b) { return a.next - b.next; });
  }

  function renderEvent(item, today) {
    var ev = item.ev;
    var multi = ev.sessions.length > 1;
    var first = parseDate(ev.sessions[0].date);
    var shown = multi ? first : item.next;

    var li = el("li", "event" + (ev.programme !== "community" ? " event--featured" : ""));
    li.id = "event-" + ev.id;

    // Date column
    var dateCol = el("div", "event__date");
    var time = el("time");
    time.setAttribute("datetime", ev.sessions[0].date);
    time.appendChild(el("span", "event__day", fmt(shown, { day: "numeric" })));
    dateCol.appendChild(time);
    dateCol.appendChild(el("span", "event__month", fmt(shown, { month: "short", year: shown.getFullYear() !== today.getFullYear() ? "numeric" : undefined })));
    dateCol.appendChild(el("span", "event__weekday", multi ? ev.sessions.length + " sessions" : fmt(shown, { weekday: "long" })));
    li.appendChild(dateCol);

    // Body
    var body = el("div", "event__body");
    var tags = el("div", "event__tags");
    tags.appendChild(el("span", "event__programme", PROGRAMMES[ev.programme] || ev.programme));
    if (ev.status && STATUSES[ev.status]) {
      tags.appendChild(el("span", "status " + STATUSES[ev.status].cls, STATUSES[ev.status].label));
    }
    body.appendChild(tags);
    body.appendChild(el("h3", "event__title", ev.title));

    var meta = el("p", "event__meta");
    if (!multi && ev.sessions[0].time) {   // time is shown only when confirmed
      meta.appendChild(el("b", null, ev.sessions[0].time));   // e.g. "From 19:00"
    }
    var v = el("span");
    v.appendChild(el("b", null, ev.venue + " "));
    v.appendChild(document.createTextNode(ev.address || ""));
    meta.appendChild(v);
    body.appendChild(meta);

    if (ev.summary) body.appendChild(el("p", null, ev.summary));

    if (multi) {
      var list = el("ul", "event__sessions");
      list.setAttribute("role", "list");
      ev.sessions.forEach(function (s) {
        var d = parseDate(s.date);
        var row = el("li", d < today ? "is-past" : "");
        row.appendChild(el("span", null, fmt(d, { weekday: "short", day: "numeric", month: "short" })));
        row.appendChild(el("span", null, s.time || ""));
        row.appendChild(el("span", null, s.label || ""));
        list.appendChild(row);
      });
      body.appendChild(list);
    }
    li.appendChild(body);

    // Action
    if (ev.linkKey) {
      var wrap = el("div", "event__action");
      var a = el("a", "btn btn--primary btn--sm", ev.linkLabel || "More");
      var section = "#" + (ev.programme === "kids" ? "kids" : ev.programme === "impact" ? "impact" : "community");
      a.setAttribute("data-link", ev.linkKey);
      a.setAttribute("href", section);
      a.setAttribute("data-fallback-href", section);   // no URL yet: link to the programme section
      a.setAttribute("data-fallback-label", "Details");
      applyLink(a);
      wrap.appendChild(a);
      li.appendChild(wrap);
    }
    return li;
  }

  function renderEvents() {
    var listEl = document.querySelector("[data-event-list]");
    var emptyEl = document.querySelector("[data-event-empty]");
    var moreBtn = document.querySelector("[data-event-more]");
    if (!listEl) return;

    var today = startOfToday();
    var items = prepare(EVENTS, today);
    var expanded = false;

    function draw() {
      listEl.textContent = "";
      var visible = expanded ? items : items.slice(0, INITIAL_EVENTS);
      visible.forEach(function (item) { listEl.appendChild(renderEvent(item, today)); });
      emptyEl.hidden = items.length > 0;
      var hiddenCount = items.length - INITIAL_EVENTS;
      moreBtn.hidden = hiddenCount <= 0;
      moreBtn.textContent = expanded ? "Show fewer dates" : "Show all " + items.length + " dates";
      moreBtn.setAttribute("aria-expanded", String(expanded));
    }
    moreBtn.addEventListener("click", function () { expanded = !expanded; draw(); });
    draw();

    // Hero: next community meet-up
    var nextEl = document.querySelector("[data-next-meetup]");
    var nextMeetup = items.filter(function (x) { return x.ev.programme === "community"; })[0];
    if (nextEl && nextMeetup) {
      nextEl.textContent = "";
      nextEl.appendChild(el("span", null, "Next chess club:"));
      nextEl.appendChild(el("strong", null, fmt(nextMeetup.next, { weekday: "long", day: "numeric", month: "long" })));
      var startsAt = nextMeetup.ev.sessions[0].time;
      if (startsAt) nextEl.appendChild(el("span", null, "· " + startsAt));
      nextEl.appendChild(el("span", null, "· " + nextMeetup.ev.venue + ", Zürich"));
      nextEl.hidden = false;
    }
  }
  renderEvents();

  /* ---------- 5. Copy email ---------- */
  document.querySelectorAll("[data-copy-email]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var email = (CONFIG.contact && CONFIG.contact.email) || "";
      var target = btn.parentElement.querySelector("[data-contact-email]");
      function selectFallback() {
        if (!target) return;
        var range = document.createRange();
        range.selectNodeContents(target);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        toast("Email address selected. Copy it with your keyboard or menu.");
      }
      try {
        navigator.clipboard.writeText(email).then(function () {
          toast("Email address copied.");
        }, selectFallback);
      } catch (e) { selectFallback(); }
    });
  });
})();
