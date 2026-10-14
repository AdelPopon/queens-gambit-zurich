/* ==========================================================================
   Queen's Gambit Zürich · Kids Chess workshop registration page
   (/kids/zollikon/, /en/kids/zollikon/)
   --------------------------------------------------------------------------
   Sessions come from the event in data/events.js (data-event-id). The form
   posts to the Kids Chess Google Apps Script web app
   (QGZ_CONFIG.kidsChess.endpoint), a separate script and Sheet from the
   WINZ event registration. The script stores the registration and only then
   emails the parent and the organisers; a success message is shown ONLY when
   it confirms the row was stored. Before showing the form, the page asks the
   script which sessions are full (no personal data). Prices are shown only
   once they are published in the Sheet. No credentials live here.
   ========================================================================== */
(function () {
  "use strict";

  var root = document.querySelector("[data-kreg]");
  if (!root) return;

  var CONFIG = window.QGZ_CONFIG || {};
  var LANG = window.QGZ_LANG || (document.documentElement.lang === "de" ? "de" : "en");
  var L = window.QGZ_L || function (v) { return v && typeof v === "object" ? v[LANG] || v.en : v; };
  var LOCALE = LANG === "de" ? "de-CH" : "en-GB";
  var ENDPOINT = CONFIG.kidsChess && CONFIG.kidsChess.endpoint;
  var MIN_AGE = 5, MAX_AGE = 13;

  var form = root.querySelector("[data-kreg-form]");
  var done = root.querySelector("[data-kreg-success]");
  var closedBox = root.querySelector("[data-kreg-closed]");
  var list = root.querySelector("[data-kreg-sessions]");
  var summary = root.querySelector("[data-kreg-summary]");
  var alertBox = root.querySelector("[data-kreg-alert]");
  var submit = root.querySelector("[data-kreg-submit]");

  var msgs = {};
  var tpl = root.querySelector("[data-kreg-messages]");
  (tpl && tpl.content ? tpl.content : root).querySelectorAll("[data-msg]").forEach(function (m) {
    msgs[m.getAttribute("data-msg")] = m.textContent.trim();
  });
  function msg(key, vars) {
    return (msgs[key] || "").replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }

  var id = root.getAttribute("data-event-id");
  var ev = (window.QGZ_EVENTS || []).filter(function (e) { return e.id === id; })[0];
  var pricing = null;        // { currency, sessions: {id: price}, packages: {n: price} } once published

  function parse(iso) { var p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var sessions = ev ? ev.sessions.filter(function (s) { return parse(s.date) >= today; }) : [];

  function showClosed(key) {
    form.hidden = true;
    closedBox.textContent = msg(key);
    closedBox.hidden = false;
  }

  /* ---------- Build the form ---------- */
  function sessionCard(s) {
    var d = parse(s.date);
    var label = document.createElement("label");
    label.className = "kreg-session";
    label.innerHTML =
      '<input type="checkbox" name="sessions">' +
      '<span class="kreg-session__tick" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span class="kreg-session__text"><span class="kreg-session__date"></span><span class="kreg-session__meta"></span></span>' +
      '<span class="kreg-session__badge" hidden></span>';
    var input = label.querySelector("input");
    input.value = s.date;
    label.querySelector(".kreg-session__date").textContent =
      d.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" });
    label.querySelector(".kreg-session__meta").textContent = [L(s.time), L(s.label)].filter(Boolean).join(" · ");
    label.querySelector(".kreg-session__badge").textContent = msg("full");
    input.addEventListener("change", onSessionChange);
    return label;
  }

  function build() {
    sessions.forEach(function (s) { list.appendChild(sessionCard(s)); });
    var age = form.querySelector("[data-kreg-age]");
    for (var a = MIN_AGE; a <= MAX_AGE; a++) {
      var o = document.createElement("option");
      o.value = String(a);
      o.textContent = msg("years", { n: a });
      age.appendChild(o);
    }
  }

  function markFull(fullIds) {
    var open = 0;
    list.querySelectorAll(".kreg-session").forEach(function (card) {
      var input = card.querySelector("input");
      var isFull = fullIds.indexOf(input.value) >= 0;
      input.disabled = isFull;
      if (isFull) input.checked = false;
      card.classList.toggle("is-full", isFull);
      card.querySelector(".kreg-session__badge").hidden = !isFull;
      if (!isFull) open++;
    });
    update();
    return open;
  }

  /* ---------- Summary and price ---------- */
  function selected() {
    return Array.prototype.map.call(list.querySelectorAll("input:checked"), function (i) { return i.value; });
  }
  function priceFor(ids) {
    if (!pricing || !ids.length) return null;
    var pkg = pricing.packages && pricing.packages[String(ids.length)];
    if (pkg != null) return pkg;
    var total = 0;
    for (var i = 0; i < ids.length; i++) {
      var p = pricing.sessions && pricing.sessions[ids[i]];
      if (p == null) return null;
      total += p;
    }
    return total;
  }
  function money(n) {
    try { return new Intl.NumberFormat(LOCALE, { style: "currency", currency: pricing.currency || "CHF", minimumFractionDigits: n % 1 ? 2 : 0 }).format(n); }
    catch (e) { return (pricing.currency || "CHF") + " " + n; }
  }
  function countText(n) { return n === 1 ? msg("count1") : msg("countN", { n: n }); }
  function update() {
    var ids = selected();
    list.querySelectorAll(".kreg-session").forEach(function (c) { c.classList.toggle("is-selected", c.querySelector("input").checked); });
    if (!ids.length) { summary.hidden = true; return; }
    var text = msg("selected", { count: countText(ids.length) });
    var price = priceFor(ids);
    if (price != null) text += " · " + msg("total", { price: money(price) });
    summary.textContent = text;
    summary.hidden = false;
  }
  // A new selection by the parent clears the "choose a session" / "full" error.
  function onSessionChange() {
    var err = form.querySelector('[data-error-for="sessions"]');
    if (selected().length && !err.hidden) { err.hidden = true; list.removeAttribute("aria-invalid"); }
    update();
  }

  /* ---------- Validation ---------- */
  function clearErrors() {
    form.querySelectorAll("[data-error-for]").forEach(function (p) { p.hidden = true; p.textContent = ""; });
    form.querySelectorAll("[aria-invalid]").forEach(function (f) { f.removeAttribute("aria-invalid"); });
    alertBox.hidden = true; alertBox.textContent = "";
  }
  function fieldError(name, text) {
    var p = form.querySelector('[data-error-for="' + name + '"]');
    var f = name === "sessions" ? list : name === "experience" ? form.querySelector(".kreg-choice") : form.elements[name];
    if (f && f.setAttribute) f.setAttribute("aria-invalid", "true");
    if (p) { p.textContent = text; p.hidden = false; }
  }
  function focusField(name) {
    var f = name === "sessions" ? list.querySelector("input:not(:disabled)")
      : name === "experience" ? form.querySelector('input[name="experience"]') : form.elements[name];
    if (f && f.focus) f.focus();
  }
  var LETTER = /[A-Za-zÀ-ÖØ-öø-ÿĀ-žḀ-ỿ]/;
  function validate() {
    var get = function (n) { return form.elements[n].value.replace(/\s+/g, " ").trim(); };
    var exp = form.querySelector('input[name="experience"]:checked');
    var v = {
      sessions: selected(),
      childFirst: get("childFirst"), childLast: get("childLast"), age: form.elements.age.value,
      experience: exp ? exp.value : "",
      parentFirst: get("parentFirst"), parentLast: get("parentLast"),
      email: form.elements.email.value.trim(), phone: get("phone"),
      consent: form.elements.consent.checked, marketing: form.elements.marketing.checked
    };
    var bad = [];
    function check(ok, name) { if (!ok) { fieldError(name, msg(name)); bad.push(name); } }
    check(v.sessions.length > 0, "sessions");
    check(LETTER.test(v.childFirst) && v.childFirst.length <= 60, "childFirst");
    check(LETTER.test(v.childLast) && v.childLast.length <= 60, "childLast");
    check(+v.age >= MIN_AGE && +v.age <= MAX_AGE, "age");
    check(v.experience === "beginner" || v.experience === "intermediate", "experience");
    check(LETTER.test(v.parentFirst) && v.parentFirst.length <= 60, "parentFirst");
    check(LETTER.test(v.parentLast) && v.parentLast.length <= 60, "parentLast");
    check(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) && v.email.length <= 254, "email");
    check(/^\+?[0-9 ()\/.\-]{6,25}$/.test(v.phone) && v.phone.replace(/\D/g, "").length >= 7, "phone");
    check(v.consent, "consent");
    return { values: v, bad: bad };
  }

  /* ---------- Submit ---------- */
  var openedAt = Date.now();
  var submitLabel = submit.textContent;
  function showAlert(key) { alertBox.textContent = msg(key) || msg("server"); alertBox.hidden = false; alertBox.focus(); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (submit.disabled) return;                // no double submission
    clearErrors();
    var r = validate();
    if (r.bad.length) { focusField(r.bad[0]); return; }

    var payload = {
      workshopId: id,
      sessions: r.values.sessions,
      childFirst: r.values.childFirst, childLast: r.values.childLast,
      age: r.values.age, experience: r.values.experience,
      parentFirst: r.values.parentFirst, parentLast: r.values.parentLast,
      email: r.values.email, phone: r.values.phone,
      consent: true, marketing: r.values.marketing,
      lang: LANG,
      website: form.elements.website.value,          // honeypot: must stay empty
      elapsedMs: Date.now() - openedAt               // bots submit instantly
    };

    submit.disabled = true; submit.setAttribute("aria-busy", "true"); submit.textContent = msg("sending");
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);

    // text/plain avoids a CORS preflight; Apps Script answers with JSON.
    fetch(ENDPOINT, {
      method: "POST", redirect: "follow", cache: "no-store",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (data) {
        if (data && data.ok === true && data.stored === true) {
          fillDone(done.querySelector("[data-kreg-done-text]"), {
            child: r.values.childFirst, count: countText(r.values.sessions.length), email: r.values.email });
          form.hidden = true; done.hidden = false; done.focus();
          done.scrollIntoView({ block: "start", behavior: "smooth" });
        } else if (data && data.code === "full") {
          if (markFull(data.full || []) === 0) showClosed("allFull");
          else { fieldError("sessions", msg("fullError")); focusField("sessions"); }
          refreshAvailability();
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
  });

  // Success text with the child's name, sessions and email in bold (as text, never HTML)
  function fillDone(p, vars) {
    p.textContent = "";
    (msgs.done || "").split(/(\{\w+\})/).forEach(function (part) {
      var m = part.match(/^\{(\w+)\}$/);
      if (m && vars[m[1]] != null) {
        var b = document.createElement("strong");
        b.textContent = vars[m[1]];
        p.appendChild(b);
      } else if (part) p.appendChild(document.createTextNode(part));
    });
  }

  // Register a sibling: keep the parent's details and consent, clear the child.
  root.querySelector("[data-kreg-another]").addEventListener("click", function () {
    ["childFirst", "childLast"].forEach(function (n) { form.elements[n].value = ""; });
    form.elements.age.value = "";
    form.querySelectorAll('input[name="experience"]').forEach(function (i) { i.checked = false; });
    clearErrors();
    openedAt = Date.now();
    done.hidden = true; form.hidden = false;
    refreshAvailability();
    form.elements.childFirst.focus();
    form.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  /* ---------- Availability (which sessions are full; published prices) ---------- */
  function refreshAvailability(first) {
    var url = ENDPOINT + (ENDPOINT.indexOf("?") < 0 ? "?" : "&") + "workshop=" + encodeURIComponent(id);
    return fetch(url, { cache: "no-store", redirect: "follow" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || data.ok !== true) return;
        if (data.open === false) { showClosed("closed"); return; }
        pricing = data.pricing || null;
        var full = Object.keys(data.sessions || {}).filter(function (k) { return data.sessions[k].full; });
        if (markFull(full) === 0) showClosed("allFull");
      })
      .catch(function () { /* the server checks capacity again on submit */ })
      .then(function () { if (first) root.classList.remove("is-loading"); });
  }

  /* ---------- Start ---------- */
  if (!ev || !sessions.length || !ENDPOINT) { showClosed("closed"); return; }
  build();
  form.hidden = false;
  root.classList.add("is-loading");
  refreshAvailability(true);
})();
