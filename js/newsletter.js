/* ==========================================================================
   Queen's Gambit Zürich: newsletter signup (Mailchimp, double opt-in)
   --------------------------------------------------------------------------
   - No Mailchimp script is loaded with the page and nothing is stored in the
     visitor's browser. The details are sent only when the visitor submits
     the form, to our Google Apps Script backend (newsletter/), which adds
     new addresses to Mailchimp as "pending".
   - Mailchimp then emails a confirmation link (double opt-in); the address
     is subscribed only after it is confirmed. Existing contacts are never
     changed by the backend.
   - Settings: data/config.js (newsletter.endpoint). Texts: the [data-nl-msg]
     elements in the page (translated with the rest of the page via
     i18n/de.json). While no endpoint is set, the form stays hidden.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = (window.QGZ_CONFIG || {}).newsletter;
  var box = document.querySelector("[data-newsletter]");
  if (!box || !cfg || !cfg.endpoint || !window.fetch) return;

  var form = box.querySelector("[data-newsletter-form]");
  var done = box.querySelector("[data-nl-success]");
  var alertEl = box.querySelector("[data-nl-alert]");
  var submitBtn = form.querySelector("button[type=submit]");
  var submitLabel = submitBtn.textContent;
  var email = form.querySelector("#nl-email");
  var consent = form.querySelector("#nl-consent");
  var honeypot = form.querySelector("[data-nl-honeypot]");
  var topics = Array.prototype.slice.call(form.querySelectorAll("[data-nl-topic]"));
  var lang = (document.documentElement.lang || "de").slice(0, 2) === "en" ? "en" : "de";
  var shownAt = Date.now();

  var msgs = {};
  box.querySelectorAll("[data-nl-msg]").forEach(function (m) {
    msgs[m.getAttribute("data-nl-msg")] = m.textContent.trim();
  });

  box.hidden = false;

  function setError(key, show) {
    var p = form.querySelector('[data-nl-error-for="' + key + '"]');
    if (!p) return;
    p.textContent = show ? msgs[key] : "";
    p.hidden = !show;
    var field = key === "email" ? email : key === "consent" ? consent : null;
    if (field) field.setAttribute("aria-invalid", show ? "true" : "false");
  }

  function showAlert(text) {
    alertEl.textContent = text;
    alertEl.hidden = !text;
    if (text) alertEl.focus();
  }

  function validate() {
    var okEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    var okTopics = topics.some(function (t) { return t.checked; });
    var okConsent = consent.checked;
    setError("email", !okEmail);
    setError("topics", !okTopics);
    setError("consent", !okConsent);
    if (!okEmail) email.focus();
    else if (!okTopics) topics[0].focus();
    else if (!okConsent) consent.focus();
    return okEmail && okTopics && okConsent;
  }

  function busy(on) {
    submitBtn.disabled = on;
    submitBtn.setAttribute("aria-busy", on ? "true" : "false");
    submitBtn.textContent = on ? msgs.sending : submitLabel;
  }

  function finish(code) {
    busy(false);
    if (code === "success") {
      form.hidden = true;
      done.hidden = false;
      done.focus();
      return;
    }
    if (code === "email" || code === "topics" || code === "consent") { setError(code, true); return; }
    showAlert(msgs[code] || msgs.error);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showAlert("");
    if (!validate()) return;

    var payload = {
      email: email.value.trim(),
      topics: topics.filter(function (t) { return t.checked; }).map(function (t) { return t.getAttribute("data-nl-topic"); }),
      lang: lang,
      consent: true,
      website: honeypot.value,                 // honeypot: must stay empty
      elapsedMs: Date.now() - shownAt           // bots submit instantly
    };

    busy(true);
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 25000);

    // text/plain avoids a CORS preflight; Apps Script answers with JSON.
    fetch(cfg.endpoint, {
      method: "POST", redirect: "follow", cache: "no-store",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json(); })
      .then(function (data) { finish(data && data.code ? data.code : "error"); })
      .catch(function () { finish("network"); })
      .then(function () { clearTimeout(timer); });
  });
})();
