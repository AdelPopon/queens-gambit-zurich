/* ==========================================================================
   Queen's Gambit Zürich · Kids Chess workshop registration page
   (/kids/zollikon/, /en/kids/zollikon/)
   --------------------------------------------------------------------------
   Sessions come from the event in data/events.js (data-event-id). Prices and
   which sessions are full come from the Kids Chess Google Apps Script
   (QGZ_CONFIG.kidsChess.endpoint), a separate script and Sheet from the WINZ
   registration. The script computes the price itself and refuses a total that
   no longer matches what the page showed. A success message is shown ONLY
   when the script confirms the row was stored. Full sessions stay selectable
   for the waiting list. No credentials live here.
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
  var TOURNAMENT = "2026-10-31";        // session with the tournament and trophies

  var form = root.querySelector("[data-kreg-form]");
  var done = root.querySelector("[data-kreg-success]");
  var closedBox = root.querySelector("[data-kreg-closed]");
  var list = root.querySelector("[data-kreg-sessions]");
  var summary = root.querySelector("[data-kreg-summary]");
  var waitBox = root.querySelector("[data-kreg-waitlist]");
  var totalLine = root.querySelector("[data-kreg-total]");
  var alertBox = root.querySelector("[data-kreg-alert]");
  var submit = root.querySelector("[data-kreg-submit]");
  var allergyDetails = root.querySelector("[data-kreg-allergy-details]");

  var msgs = {};
  var tpl = root.querySelector("[data-kreg-messages]");
  (tpl && tpl.content ? tpl.content : root).querySelectorAll("[data-msg]").forEach(function (m) {
    msgs[m.getAttribute("data-msg")] = m.textContent.replace(/\s+/g, " ").trim();
  });
  msgs.and = " " + (msgs.and || "and") + " ";
  function msg(key, vars) {
    return (msgs[key] || "").replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }

  var id = root.getAttribute("data-event-id");
  var ev = (window.QGZ_EVENTS || []).filter(function (e) { return e.id === id; })[0];
  var pricing = null;        // { currency, sessions: {id: price}, packages: {n: price} }
  var fullIds = [];

  function parse(iso) { var p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var sessions = ev ? ev.sessions.filter(function (s) { return parse(s.date) >= today; }) : [];
  var allIds = ev ? ev.sessions.map(function (s) { return s.date; }) : [];

  function showClosed(key) {
    form.hidden = true;
    closedBox.textContent = msg(key);
    closedBox.hidden = false;
  }
  function longDate(iso) { return parse(iso).toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" }); }

  /* ---------- Prices ---------- */
  function money(n) {
    var cur = (pricing && pricing.currency) || "CHF";
    return cur + " " + (n % 1 ? n.toFixed(2) : String(n));
  }
  function sumOf(ids) {
    var total = 0;
    for (var i = 0; i < ids.length; i++) {
      var p = pricing && pricing.sessions && pricing.sessions[ids[i]];
      if (p == null) return null;
      total += p;
    }
    return total;
  }
  function priceFor(ids) {                 // same rule as the Apps Script
    if (!pricing || !ids.length) return null;
    var pkg = pricing.packages && pricing.packages[String(ids.length)];
    return pkg != null ? pkg : sumOf(ids);
  }

  /* ---------- Build the form ---------- */
  function sessionCard(s) {
    var label = document.createElement("label");
    label.className = "kreg-session";
    label.innerHTML =
      '<input type="checkbox" name="sessions">' +
      '<span class="kreg-session__tick" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>' +
      '<span class="kreg-session__text"><span class="kreg-session__date"></span><span class="kreg-session__meta"></span><span class="kreg-session__badge" hidden></span></span>' +
      '<span class="kreg-session__price"></span>';
    var input = label.querySelector("input");
    input.value = s.date;
    label.querySelector(".kreg-session__date").textContent = longDate(s.date);
    label.querySelector(".kreg-session__meta").textContent = [L(s.time), L(s.label)].filter(Boolean).join(" · ");
    label.querySelector(".kreg-session__badge").textContent = msg("full");
    input.addEventListener("change", onSessionChange);
    return label;
  }

  function build() {
    sessions.forEach(function (s) { list.appendChild(sessionCard(s)); });
    form.querySelectorAll('input[name="allergies"]').forEach(function (r) {
      r.addEventListener("change", function () {
        var other = form.querySelector('input[name="allergies"]:checked').value === "other";
        allergyDetails.hidden = !other;
        if (other) form.elements.allergyDetails.focus();
      });
    });
  }

  function applyPrices() {
    list.querySelectorAll(".kreg-session").forEach(function (card) {
      var p = pricing && pricing.sessions && pricing.sessions[card.querySelector("input").value];
      card.querySelector(".kreg-session__price").textContent = p != null ? money(p) : "";
    });
    var pp = root.querySelector("[data-kreg-package-price]");
    var full = priceFor(allIds), sum = sumOf(allIds);
    if (pp) pp.textContent = full != null && sum != null && sum > full ? "(" + msg("packagePrice", { price: money(full), full: money(sum) }) + ")" : (full != null ? "(" + money(full) + ")" : "");
    update();
  }

  function markFull(ids) {
    fullIds = ids;
    list.querySelectorAll(".kreg-session").forEach(function (card) {
      var isFull = ids.indexOf(card.querySelector("input").value) >= 0;
      card.classList.toggle("is-full", isFull);
      card.querySelector(".kreg-session__badge").hidden = !isFull;
    });
    update();
  }

  /* ---------- Summary, price, inclusions, waiting list ---------- */
  function selected() {
    return Array.prototype.map.call(list.querySelectorAll("input:checked"), function (i) { return i.value; });
  }
  function countText(n) { return n === 1 ? msg("count1") : msg("countN", { n: n }); }
  function selectedFull() { return selected().filter(function (x) { return fullIds.indexOf(x) >= 0; }); }

  function update() {
    var ids = selected();
    list.querySelectorAll(".kreg-session").forEach(function (c) { c.classList.toggle("is-selected", c.querySelector("input").checked); });
    var price = priceFor(ids), sum = sumOf(ids);
    if (!ids.length) {
      summary.hidden = true; totalLine.hidden = true;
    } else {
      var vars = { count: countText(ids.length), price: price != null ? money(price) : "", full: sum != null ? money(sum) : "", saving: sum != null && price != null ? money(sum - price) : "" };
      summary.querySelector("[data-kreg-summary-total]").textContent =
        price == null ? msg("summaryNoPrice", vars) : (sum != null && sum > price ? msg("summaryDiscount", vars) : msg("summary", vars));
      var inc = [msg("incSession")];
      if (ids.indexOf(TOURNAMENT) >= 0) inc.push(msg("incTournament"));
      if (ids.length === allIds.length) inc.push(msg("incFull"));
      var ul = summary.querySelector("[data-kreg-summary-inc]");
      ul.textContent = "";
      inc.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
      if (ids.length !== allIds.length) {
        var li = document.createElement("li"); li.className = "kreg-summary__note"; li.textContent = msg("incNoCert"); ul.appendChild(li);
      }
      summary.hidden = false;
      totalLine.textContent = price != null ? msg("totalLine", { price: money(price) }) : "";
      totalLine.hidden = price == null;
    }
    var waitFor = selectedFull();
    if (waitFor.length) {
      waitBox.textContent = msg("waitlistNote", { dates: waitFor.map(longDate).join(msgs.and) });
      waitBox.hidden = false;
      if (!submit.disabled) submit.textContent = msg("waitlistButton");
    } else {
      waitBox.hidden = true;
      if (!submit.disabled) submit.textContent = submitLabel;
    }
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
  var GROUPS = { sessions: null, experience: 'input[name="experience"]', languages: 'input[name="languages"]', allergies: 'input[name="allergies"]', photo: 'input[name="photo"]' };
  function fieldError(name, text) {
    var p = form.querySelector('[data-error-for="' + name + '"]');
    var f = name === "sessions" ? list : name in GROUPS ? form.querySelector(GROUPS[name]).closest(".kreg-choice") : form.elements[name];
    if (f && f.setAttribute) f.setAttribute("aria-invalid", "true");
    if (p) { p.textContent = text; p.hidden = false; }
  }
  function focusField(name) {
    var f = name === "sessions" ? list.querySelector("input") : name in GROUPS ? form.querySelector(GROUPS[name]) : form.elements[name];
    if (f && f.focus) f.focus();
  }
  function ageOn(dob, day) {
    var b = dob.split("-").map(Number), t = day.split("-").map(Number);
    var age = t[0] - b[0];
    if (t[1] < b[1] || (t[1] === b[1] && t[2] < b[2])) age--;
    return age;
  }
  var LETTER = /[A-Za-zÀ-ÖØ-öø-ÿĀ-žḀ-ỿ]/;
  function validate() {
    var get = function (n) { return form.elements[n].value.replace(/\s+/g, " ").trim(); };
    var radio = function (n) { var r = form.querySelector('input[name="' + n + '"]:checked'); return r ? r.value : ""; };
    var v = {
      sessions: selected(),
      childFirst: get("childFirst"), childLast: get("childLast"), dob: form.elements.dob.value,
      experience: radio("experience"),
      languages: Array.prototype.map.call(form.querySelectorAll('input[name="languages"]:checked'), function (i) { return i.value; }),
      allergies: radio("allergies"), allergyDetails: get("allergyDetails"),
      parentFirst: get("parentFirst"), parentLast: get("parentLast"),
      email: form.elements.email.value.trim(), phone: get("phone"),
      photo: radio("photo"), notes: form.elements.notes.value.trim(),
      terms: form.elements.terms.checked, consent: form.elements.consent.checked, marketing: form.elements.marketing.checked
    };
    var bad = [];
    function check(ok, name) { if (!ok) { fieldError(name, msg(name)); bad.push(name); } }
    check(v.sessions.length > 0, "sessions");
    check(LETTER.test(v.childFirst) && v.childFirst.length <= 60, "childFirst");
    check(LETTER.test(v.childLast) && v.childLast.length <= 60, "childLast");
    var first = v.sessions[0] || (sessions[0] && sessions[0].date);
    var dobOk = /^\d{4}-\d{2}-\d{2}$/.test(v.dob) && first && ageOn(v.dob, first) >= MIN_AGE && ageOn(v.dob, first) <= MAX_AGE;
    check(dobOk, "dob");
    check(["never", "beginner", "basic", "regular"].indexOf(v.experience) >= 0, "experience");
    check(v.languages.length > 0, "languages");
    check(v.allergies === "none" || v.allergies === "other", "allergies");
    if (v.allergies === "other") check(v.allergyDetails.length >= 2, "allergyDetails");
    check(LETTER.test(v.parentFirst) && v.parentFirst.length <= 60, "parentFirst");
    check(LETTER.test(v.parentLast) && v.parentLast.length <= 60, "parentLast");
    check(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email) && v.email.length <= 254, "email");
    check(/^\+?[0-9 ()\/.\-]{6,25}$/.test(v.phone) && v.phone.replace(/\D/g, "").length >= 7, "phone");
    check(v.photo === "yes" || v.photo === "no", "photo");
    check(v.terms, "terms");
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
    var v = r.values;
    var waitlist = selectedFull().length > 0;
    var shownTotal = priceFor(v.sessions);

    var payload = {
      workshopId: id, sessions: v.sessions,
      childFirst: v.childFirst, childLast: v.childLast, dob: v.dob,
      experience: v.experience, languages: v.languages,
      allergies: v.allergies, allergyDetails: v.allergies === "other" ? v.allergyDetails : "",
      parentFirst: v.parentFirst, parentLast: v.parentLast, email: v.email, phone: v.phone,
      photo: v.photo, notes: v.notes,
      terms: true, consent: true, marketing: v.marketing,
      waitlist: waitlist, expectedTotal: shownTotal,
      lang: LANG,
      website: form.elements.website.value,          // honeypot: must stay empty
      elapsedMs: Date.now() - openedAt               // bots submit instantly
    };

    var label = submit.textContent;
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
          var wait = data.status === "waitlist";
          var count = countText(v.sessions.length) + (!wait && data.price != null ? " (" + money(data.price) + ")" : "");
          done.querySelector("[data-kreg-done-title]").textContent = msg(wait ? "doneTitleWait" : "doneTitle");
          fillDone(done.querySelector("[data-kreg-done-text]"), wait ? "doneWait" : "done", { child: v.childFirst, count: count, email: v.email });
          form.hidden = true; done.hidden = false; done.focus();
          done.scrollIntoView({ block: "start", behavior: "smooth" });
        } else if (data && data.code === "full") {
          markFull((data.full || []).concat(fullIds));
          fieldError("sessions", msg("fullError")); focusField("sessions");
        } else if (data && data.code === "price") {
          if (data.pricing) { pricing = data.pricing; applyPrices(); }
          showAlert("price");
        } else {
          var code = data && data.code;
          showAlert(code === "duplicate" || code === "rate" || code === "closed" ? code : "server");
        }
      })
      .catch(function () { showAlert("network"); })
      .then(function () {
        clearTimeout(timer);
        submit.disabled = false; submit.removeAttribute("aria-busy"); submit.textContent = label;
        update();
      });
  });

  // Success text with the child's name, booking and email in bold (as text, never HTML)
  function fillDone(p, key, vars) {
    p.textContent = "";
    (msgs[key] || "").split(/(\{\w+\})/).forEach(function (part) {
      var m = part.match(/^\{(\w+)\}$/);
      if (m && vars[m[1]] != null) {
        var b = document.createElement("strong");
        b.textContent = vars[m[1]];
        p.appendChild(b);
      } else if (part) p.appendChild(document.createTextNode(part));
    });
  }

  // Register a sibling: keep the parent's details, consents and sessions; clear the child.
  root.querySelector("[data-kreg-another]").addEventListener("click", function () {
    ["childFirst", "childLast", "dob", "allergyDetails", "notes"].forEach(function (n) { form.elements[n].value = ""; });
    form.querySelectorAll('input[name="experience"], input[name="languages"], input[name="allergies"], input[name="photo"]').forEach(function (i) { i.checked = false; });
    allergyDetails.hidden = true;
    clearErrors();
    openedAt = Date.now();
    done.hidden = true; form.hidden = false;
    refreshAvailability();
    form.elements.childFirst.focus();
    form.scrollIntoView({ block: "start", behavior: "smooth" });
  });

  /* ---------- Availability (full sessions) and published prices ---------- */
  function refreshAvailability(first) {
    var url = ENDPOINT + (ENDPOINT.indexOf("?") < 0 ? "?" : "&") + "workshop=" + encodeURIComponent(id);
    return fetch(url, { cache: "no-store", redirect: "follow" })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || data.ok !== true) return;
        if (data.open === false) { showClosed("closed"); return; }
        pricing = data.pricing || null;
        markFull(Object.keys(data.sessions || {}).filter(function (k) { return data.sessions[k].full; }));
        applyPrices();
      })
      .catch(function () { /* the server checks capacity and price again on submit */ })
      .then(function () { if (first) root.classList.remove("is-loading"); });
  }

  /* ---------- Start ---------- */
  if (!ev || !sessions.length || !ENDPOINT || CONFIG.kidsChess.open === false) { showClosed("closed"); return; }
  build();
  form.hidden = false;
  root.classList.add("is-loading");
  refreshAvailability(true);
})();
