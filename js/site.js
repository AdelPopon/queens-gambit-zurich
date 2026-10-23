/* ==========================================================================
   Queen's Gambit Zürich · site behaviour · v1
   1. Links from config      4. Upcoming events
   2. Mobile navigation      5. Copy email
   3. Header state           6. Toast
   7. Event registration (form → Google Apps Script → Google Sheets)
   No dependencies. Content lives in data/config.js and data/events.js;
   interface text in js/i18n.js (English / German).
   ========================================================================== */
(function () {
  "use strict";

  var CONFIG = window.QGZ_CONFIG || { links: {}, contact: {} };
  var LANG = window.QGZ_LANG || "en";
  var T = window.QGZ_T || function (k) { return k; };
  var L = window.QGZ_L || function (v) { return v; };
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
    if (CONFIG.closedLinks && CONFIG.closedLinks[key]) {   // registration closed: label instead of a button
      var tag = document.createElement("span");
      tag.className = "status status--planned";
      tag.textContent = T("regClosed");
      el.parentNode.replaceChild(tag, el);
      return;
    }
    var url = L(CONFIG.links && CONFIG.links[key]);   // may be { en, de }
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
    toggle.querySelector(".site-nav__toggle-label").textContent = open ? T("close") : T("menu");
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
  var STATUSES = {
    "workshop": { cls: "status--pilot" },
    "upcoming-pilot": { cls: "status--pilot" },
    "in-development": { cls: "status--dev" },
    "planned": { cls: "status--planned" }
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
  function fmt(date, opts) { return date.toLocaleDateString(T("locale"), opts); }

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

  // Title with partner names linked to their official websites (new tab).
  function eventTitle(ev) {
    var h = el("h3", "event__title");
    var rest = L(ev.title);
    (ev.partners || []).forEach(function (pt) {
      if (!pt.url) return;
      var i = rest.indexOf(pt.name);
      if (i < 0) return;
      h.appendChild(document.createTextNode(rest.slice(0, i)));
      var a = el("a", "event__partner", pt.name);
      a.href = pt.url; a.target = "_blank"; a.rel = "noopener";
      a.setAttribute("aria-label", T("opensNewTab", { name: pt.name }));
      h.appendChild(a);
      rest = rest.slice(i + pt.name.length);
    });
    h.appendChild(document.createTextNode(rest));
    return h;
  }

  /* Programme panel and registration button (events with `schedule` /
     `registration` in data/events.js) */
  var panelCount = 0;
  function canRegister(ev) {
    return !!(ev.registration && CONFIG.registration && CONFIG.registration.endpoint && window.HTMLDialogElement);
  }
  function eventExtras(ev, opts) {
    var wrap = el("div", "event__extras");
    var buttons = el("div", "event__buttons");
    wrap.appendChild(buttons);

    if (ev.schedule) {
      var id = "event-programme-" + (++panelCount);
      var btn = el("button", "btn btn--ghost btn--sm event__programme-toggle");
      btn.type = "button";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", id);
      var label = el("span", null, T("viewProgramme"));
      btn.appendChild(label);
      var chev = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chev.setAttribute("viewBox", "0 0 24 24"); chev.setAttribute("width", "16"); chev.setAttribute("height", "16");
      chev.setAttribute("aria-hidden", "true"); chev.setAttribute("class", "event__chevron");
      chev.innerHTML = '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      btn.appendChild(chev);
      buttons.appendChild(btn);

      var panel = el("div", "event__panel");
      panel.id = id;
      var inner = el("div", "event__panel-inner");
      var table = el("table", "programme");
      var cap = el("caption", "visually-hidden", T("programmeItem") + ": " + L(ev.title));
      table.appendChild(cap);
      var thead = el("thead"); var hr = el("tr");
      [T("programmeTime"), T("programmeItem"), T("programmeDuration")].forEach(function (h) {
        var th = el("th", null, h); th.scope = "col"; hr.appendChild(th);
      });
      thead.appendChild(hr); table.appendChild(thead);
      var tbody = el("tbody");
      ev.schedule.forEach(function (row) {
        var tr = el("tr");
        tr.appendChild(el("td", "programme__time", L(row.time)));
        tr.appendChild(el("td", "programme__item", L(row.item)));
        tr.appendChild(el("td", "programme__duration", L(row.duration)));
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      inner.appendChild(table);
      panel.appendChild(inner);
      panel.setAttribute("aria-hidden", "true");
      panel.inert = true;
      wrap.appendChild(panel);

      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        label.textContent = open ? T("hideProgramme") : T("viewProgramme");
        panel.classList.toggle("is-open", open);
        panel.setAttribute("aria-hidden", String(!open));
        panel.inert = !open;
      });
    }

    if (canRegister(ev) && !(opts && opts.noRegister)) {
      var reg = el("button", "btn btn--primary btn--sm", T("registerFree"));
      reg.type = "button";
      reg.addEventListener("click", function () { openRegistration(ev, reg); });
      buttons.appendChild(reg);
    }
    return wrap;
  }

  function renderEvent(item, today, opts) {
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
    dateCol.appendChild(el("span", "event__weekday", multi ? T("sessions", { n: ev.sessions.length }) : fmt(shown, { weekday: "long" })));
    li.appendChild(dateCol);

    // Body
    var body = el("div", "event__body");
    var tags = el("div", "event__tags");
    if (ev.special) tags.appendChild(el("span", "event__programme event__programme--special", T("specialEvent")));
    else tags.appendChild(el("span", "event__programme", T("programme." + ev.programme)));
    if (ev.status && STATUSES[ev.status]) {
      tags.appendChild(el("span", "status " + STATUSES[ev.status].cls, T("status." + ev.status)));
    }
    body.appendChild(tags);
    body.appendChild(eventTitle(ev));

    var meta = el("p", "event__meta");
    if (!multi && ev.sessions[0].time) {   // time is shown only when confirmed
      meta.appendChild(el("b", null, L(ev.sessions[0].time)));   // e.g. "From 19:00"
    }
    if (ev.coach) {
      var c = el("span");
      c.appendChild(el("b", null, T("coach") + " "));
      c.appendChild(document.createTextNode(ev.coach));
      meta.appendChild(c);
    }
    var v = el("span");
    v.appendChild(el("b", null, ev.venue + " "));
    v.appendChild(document.createTextNode(ev.address || ""));
    meta.appendChild(v);
    if (ev.admission) meta.appendChild(el("span", "event__admission", L(ev.admission)));
    body.appendChild(meta);

    if (ev.summary) body.appendChild(el("p", null, L(ev.summary)));

    if (multi) {
      var list = el("ul", "event__sessions");
      list.setAttribute("role", "list");
      ev.sessions.forEach(function (s) {
        var d = parseDate(s.date);
        var row = el("li", d < today ? "is-past" : "");
        row.appendChild(el("span", null, fmt(d, { weekday: "short", day: "numeric", month: "short" })));
        row.appendChild(el("span", null, L(s.time) || ""));
        row.appendChild(el("span", null, L(s.label) || ""));
        list.appendChild(row);
      });
      // Phones: the dates fold away behind a toggle (css/features.css); always open on larger screens
      var foldId = "event-dates-" + ev.id;
      var more = el("div", "event__more");
      var tgl = el("button", "btn btn--ghost btn--sm event__dates-toggle");
      tgl.type = "button";
      tgl.setAttribute("aria-expanded", "false");
      tgl.setAttribute("aria-controls", foldId);
      var tglLabel = el("span", null, T("viewDates"));
      tgl.appendChild(tglLabel);
      var chev2 = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chev2.setAttribute("viewBox", "0 0 24 24"); chev2.setAttribute("width", "16"); chev2.setAttribute("height", "16");
      chev2.setAttribute("aria-hidden", "true"); chev2.setAttribute("class", "event__chevron");
      chev2.innerHTML = '<path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      tgl.appendChild(chev2);
      var fold = el("div", "event__fold");
      fold.id = foldId;
      var foldInner = el("div", "event__fold-inner");
      foldInner.appendChild(list);
      fold.appendChild(foldInner);
      tgl.addEventListener("click", function () {
        var open = tgl.getAttribute("aria-expanded") !== "true";
        tgl.setAttribute("aria-expanded", String(open));
        fold.classList.toggle("is-open", open);
        tglLabel.textContent = open ? T("hideDates") : T("viewDates");
      });
      more.appendChild(tgl);
      more.appendChild(fold);
      body.appendChild(more);
    }
    if (ev.schedule || (canRegister(ev) && !(opts && opts.noRegister))) body.appendChild(eventExtras(ev, opts));
    li.appendChild(body);

    // Action
    if (ev.linkKey) {
      var wrap = el("div", "event__action");
      var a = el("a", "btn btn--primary btn--sm", L(ev.linkLabel) || T("more"));
      var section = "#" + (ev.programme === "kids" ? "kids" : ev.programme === "impact" ? "impact" : "community");
      a.setAttribute("data-link", ev.linkKey);
      a.setAttribute("href", section);
      a.setAttribute("data-fallback-href", section);   // no URL yet: link to the programme section
      a.setAttribute("data-fallback-label", T("details"));
      wrap.appendChild(a);
      applyLink(a);   // after appending: a closed registration replaces the button
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
      moreBtn.textContent = expanded ? T("showFewer") : T("showAll", { n: items.length });
      moreBtn.setAttribute("aria-expanded", String(expanded));
    }
    moreBtn.addEventListener("click", function () { expanded = !expanded; draw(); });
    draw();

    // Hero: next community meet-up
    var nextEl = document.querySelector("[data-next-meetup]");
    var nextMeetup = items.filter(function (x) { return x.ev.programme === "community"; })[0];
    if (nextEl && nextMeetup) {
      nextEl.textContent = "";
      nextEl.appendChild(el("span", null, T("nextClub")));
      nextEl.appendChild(el("strong", null, fmt(nextMeetup.next, { weekday: "long", day: "numeric", month: "long" })));
      var startsAt = nextMeetup.ev.sessions[0].time;
      if (startsAt) nextEl.appendChild(el("span", null, "· " + L(startsAt)));
      nextEl.appendChild(el("span", null, "· " + nextMeetup.ev.venue + ", Zürich"));
      nextEl.hidden = false;
    }
  }
  renderEvents();

  /* ---------- 4b. Event structured data (schema.org) for search engines ----------
     The build (tools/build.py) writes the event data into the page as
     <script id="qgz-events-ld"> so it is readable without JavaScript. Here it is
     refreshed with the visitor's date (past events drop out), using the same
     function (js/event-schema.js). Pages without that element get none. */
  function updateEventSchema() {
    var s = document.getElementById("qgz-events-ld");
    if (!s || !window.QGZ_buildEventSchema) return;
    if (s.getAttribute("data-scope") === "event") return;   // single event page: static data stays
    var graph = window.QGZ_buildEventSchema(EVENTS, { lang: LANG, today: startOfToday() });
    if (!graph.length) { s.parentNode.removeChild(s); return; }
    s.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": graph });
  }
  updateEventSchema();

  /* ---------- 4d. Kids workshop details: fold away on phones ----------
     On small screens the sessions, facts and levels of a workshop card are
     collapsed behind a "View details" button; larger screens always show them.
     Without JavaScript everything stays visible. */
  document.querySelectorAll(".pilot__toggle").forEach(function (btn) {
    var card = btn.closest(".pilot");
    var panel = document.getElementById(btn.getAttribute("aria-controls"));
    var label = btn.querySelector("[data-pilot-toggle-label]");
    if (!card || !panel) return;
    card.classList.add("is-collapsible");
    btn.hidden = false;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "true";
      btn.setAttribute("aria-expanded", String(open));
      panel.classList.toggle("is-open", open);
      if (label) label.textContent = open ? T("hideDetails") : T("viewDetails");
    });
  });

  /* ---------- 4c. Floating back-to-top button ----------
     Hidden near the top; appears after scrolling down one screen. */
  var toTop = document.querySelector("[data-to-top]");
  if (toTop) {
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    var setToTop = function () { toTop.classList.toggle("is-visible", window.scrollY > Math.max(600, window.innerHeight * 0.8)); };
    window.addEventListener("scroll", setToTop, { passive: true });
    window.addEventListener("resize", setToTop);
    setToTop();
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" });
      var target = document.querySelector(".brand") || document.body;
      if (target.focus) target.focus({ preventScroll: true });
    });
  }

  /* ---------- 4e. Visitor statistics (GoatCounter) ----------
     Loads the self-hosted counter (js/count.js) only when a GoatCounter code is
     set in data/config.js. No cookies; see the Privacy Policy, section 3. */
  (function () {
    var code = CONFIG.analytics && CONFIG.analytics.goatcounter;
    if (!code || !/^[a-z0-9-]+$/.test(code)) return;
    // Count each page by its address only; link parameters such as
    // utm_source=newsletter are still sent separately as the campaign.
    window.goatcounter = window.goatcounter || {};
    window.goatcounter.path = function () { return location.pathname; };
    var s = document.createElement("script");
    s.async = true;
    s.src = "/js/count.js?v=2.7.0";
    s.setAttribute("data-goatcounter", "https://" + code + ".goatcounter.com/count");
    document.head.appendChild(s);
  })();

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
        toast(T("emailSelected"));
      }
      try {
        navigator.clipboard.writeText(email).then(function () {
          toast(T("emailCopied"));
        }, selectFallback);
      } catch (e) { selectFallback(); }
    });
  });

  /* ---------- 7. Event registration ----------
     The form posts to a Google Apps Script web app (CONFIG.registration.endpoint),
     which stores the registration in Google Sheets and only then sends the
     confirmation emails. A success message is shown ONLY when the script
     confirms that the registration was stored. No credentials live here. */
  function openRegistration(ev, opener) {
    var dlg = document.querySelector("[data-reg-dialog]");
    if (!dlg) return;
    var form = dlg.querySelector("[data-reg-form]");
    var done = dlg.querySelector("[data-reg-success]");
    var msgs = {};
    var tpl = dlg.querySelector("[data-reg-messages]");
    (tpl && tpl.content ? tpl.content : tpl || dlg).querySelectorAll("[data-msg]").forEach(function (m) { msgs[m.getAttribute("data-msg")] = m.textContent.trim(); });
    var item = { ev: ev, d: parseDate(ev.sessions[0].date) };

    dlg.querySelector("[data-reg-event-title]").textContent = L(ev.title);
    dlg.querySelector("[data-reg-event-meta]").textContent =
      [fmt(item.d, { weekday: "long", day: "numeric", month: "long", year: "numeric" }), L(ev.sessions[0].time), ev.venue + ", " + ev.address]
        .filter(Boolean).join(" · ");

    form.hidden = false; done.hidden = true;
    form.reset();
    clearErrors(form);
    syncChessFields(form);
    form.dataset.eventId = ev.id;
    form.dataset.openedAt = String(Date.now());
    dlg._opener = opener;
    var inline = dlg.hasAttribute("data-reg-inline");   // registration page: form is part of the page
    if (!inline) {
      dlg.showModal();
      var first = form.querySelector("input:not([type=hidden]):not([tabindex='-1'])");
      if (first) first.focus();
    }

    if (!dlg._wired) {
      dlg._wired = true;
      form.addEventListener("submit", function (e) { e.preventDefault(); submitRegistration(dlg, form, done, msgs); });
      form.addEventListener("change", function (e) {
        if (e.target === form.elements.type || e.target.hasAttribute("data-none-for")) syncChessFields(form);
      });
      if (inline) return;
      dlg.querySelectorAll("[data-reg-close]").forEach(function (b) { b.addEventListener("click", function () { dlg.close(); }); });
      dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });   // click on backdrop
      dlg.addEventListener("close", function () { if (dlg._opener) dlg._opener.focus(); });
    }
  }

  /* ---------- 7b. Registration page (/winz/, /de/winz/) ----------
     A shareable page that shows the registration form straight away, followed
     by the event card (programme, WINZ link). The event comes from
     data/events.js (id in data-event-id). After the event, or while no
     endpoint is configured, the form is replaced by the "closed" message. */
  function initRegistrationPage() {
    var page = document.querySelector("[data-reg-page]");
    if (!page) return;
    var id = page.getAttribute("data-event-id");
    var ev = EVENTS.filter(function (e) { return e.id === id; })[0];
    var dlg = page.querySelector("[data-reg-dialog]");
    var today = startOfToday();
    var item = ev ? prepare([ev], today)[0] : null;   // undefined once the event is over
    var open = !!(item && ev.registration && CONFIG.registration && CONFIG.registration.endpoint);

    var cardList = page.querySelector("[data-reg-event-card]");
    if (item && cardList) cardList.appendChild(renderEvent(item, today, { noRegister: true }));

    if (open) { openRegistration(ev, null); return; }
    var form = dlg.querySelector("[data-reg-form]");
    var msg = dlg.querySelector('[data-reg-messages]');
    var closed = msg && msg.content ? msg.content.querySelector('[data-msg="closed"]') : null;
    form.hidden = true;
    var note = el("p", "reg-form__alert", closed ? closed.textContent.trim() : "");
    form.parentNode.insertBefore(note, form);
    var free = dlg.querySelector(".reg-dialog__free");
    if (free) free.hidden = true;
  }
  initRegistrationPage();

  function clearErrors(form) {
    form.querySelectorAll("[data-error-for]").forEach(function (p) { p.hidden = true; p.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach(function (f) { f.removeAttribute("aria-invalid"); });
    var box = form.querySelector("[data-reg-alert]");
    box.hidden = true; box.textContent = "";
  }
  /* Elo and chess club are asked only for the blitz tournament (Blitz or Both);
     there they are required, unless "No Elo rating" / "No chess club" is ticked. */
  function isChess(type) { return type === "blitz" || type === "both"; }
  function syncChessFields(form) {
    var box = form.querySelector("[data-reg-chess]");
    if (!box) return;
    var on = isChess(form.elements.type.value);
    box.hidden = !on;
    ["elo", "club"].forEach(function (name) {
      var input = form.elements[name], none = form.querySelector('[data-none-for="' + name + '"]');
      if (!input) return;
      input.required = on && !(none && none.checked);
      input.disabled = !!(none && none.checked);
      if (input.disabled) input.value = "";
    });
  }

  function fieldError(form, name, text) {
    var f = form.elements[name], p = form.querySelector('[data-error-for="' + name + '"]');
    if (f && f.setAttribute) f.setAttribute("aria-invalid", "true");
    if (p) { p.textContent = text; p.hidden = false; }
  }

  function validate(form, msgs) {
    var v = {
      name: form.elements.name.value.trim().replace(/\s+/g, " "),
      email: form.elements.email.value.trim(),
      type: form.elements.type.value,
      elo: form.elements.elo.value.trim(),
      eloNone: !!(form.elements.eloNone && form.elements.eloNone.checked),
      club: form.elements.club ? form.elements.club.value.trim().replace(/\s+/g, " ").slice(0, 100) : "",
      clubNone: !!(form.elements.clubNone && form.elements.clubNone.checked),
      consent: form.elements.consent.checked
    };
    var bad = [];
    if (v.name.length < 2 || v.name.length > 100) { fieldError(form, "name", msgs["name"]); bad.push("name"); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) || v.email.length > 254) { fieldError(form, "email", msgs["email"]); bad.push("email"); }
    if (["general", "blitz", "both"].indexOf(v.type) < 0) { fieldError(form, "type", msgs["type"]); bad.push("type"); }
    if (isChess(v.type)) {
      if (!v.eloNone && !(/^\d{1,4}$/.test(v.elo) && +v.elo >= 100 && +v.elo <= 3500)) { fieldError(form, "elo", msgs["elo"]); bad.push("elo"); }
      if (!v.clubNone && v.club.length < 2) { fieldError(form, "club", msgs["club"]); bad.push("club"); }
    } else {
      v.elo = ""; v.eloNone = false; v.club = ""; v.clubNone = false;   // not asked for general attendance
    }
    if (v.eloNone) v.elo = "";
    if (v.clubNone) v.club = "";
    if (!v.consent) { fieldError(form, "consent", msgs["consent"]); bad.push("consent"); }
    return { values: v, bad: bad };
  }

  function submitRegistration(dlg, form, done, msgs) {
    clearErrors(form);
    var r = validate(form, msgs);
    if (r.bad.length) { var f = form.elements[r.bad[0]]; if (f && f.focus) f.focus(); return; }

    var alertBox = form.querySelector("[data-reg-alert]");
    var submit = form.querySelector("[data-reg-submit]");
    var submitLabel = submit.textContent;
    function showAlert(key) { alertBox.textContent = msgs[key] || msgs["server"]; alertBox.hidden = false; alertBox.focus(); }

    var payload = {
      eventId: form.dataset.eventId,
      name: r.values.name,
      email: r.values.email,
      type: r.values.type,
      elo: r.values.elo,
      eloNone: r.values.eloNone,
      club: r.values.club,
      clubNone: r.values.clubNone,
      lang: LANG,
      consent: true,
      website: form.elements.website.value,                       // honeypot: must stay empty
      elapsedMs: Date.now() - Number(form.dataset.openedAt || 0)  // bots submit instantly
    };

    submit.disabled = true; submit.setAttribute("aria-busy", "true"); submit.textContent = msgs["sending"];
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);

    // text/plain avoids a CORS preflight; Apps Script answers with JSON.
    fetch(CONFIG.registration.endpoint, {
      method: "POST", redirect: "follow", cache: "no-store",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (data) {
        if (data && data.ok === true && data.stored === true) {
          done.querySelector("[data-reg-email]").textContent = r.values.email;
          form.hidden = true; done.hidden = false; done.focus();
        } else {
          var code = data && data.code;
          showAlert(code === "duplicate" || code === "rate" || code === "closed" ? code : "server");
        }
      })
      .catch(function () { showAlert("network"); })
      .then(function () {
        clearTimeout(timer);
        submit.disabled = false; submit.removeAttribute("aria-busy"); submit.textContent = submitLabel;
      });
  }
})();
