/* ==========================================================================
   Queen's Gambit Zürich: newsletter signup (Mailchimp, double opt-in)
   --------------------------------------------------------------------------
   - No Mailchimp script is loaded with the page and nothing is stored in the
     visitor's browser. Data is sent to Mailchimp only when the visitor
     submits the form (Mailchimp's standard signup endpoint, JSONP response).
   - Mailchimp then emails a confirmation link (double opt-in); the address
     is subscribed only after it is confirmed.
   - Settings: data/config.js (newsletter). Texts: the [data-nl-msg] elements
     in the page (translated with the rest of the page via i18n/de.json).
   - Without JavaScript the form posts to Mailchimp's own signup page.
   ========================================================================== */
(function () {
  "use strict";

  var cfg = (window.QGZ_CONFIG || {}).newsletter;
  var box = document.querySelector("[data-newsletter]");
  if (!box || !cfg || !cfg.action || !cfg.u || !cfg.id) return;

  var form = box.querySelector("[data-newsletter-form]");
  var done = box.querySelector("[data-nl-success]");
  var alertEl = box.querySelector("[data-nl-alert]");
  var submitBtn = form.querySelector("button[type=submit]");
  var email = form.querySelector("#nl-email");
  var consent = form.querySelector("#nl-consent");
  var honeypot = form.querySelector("[data-nl-honeypot]");
  var topics = Array.prototype.slice.call(form.querySelectorAll("[data-nl-topic]"));
  var lang = (document.documentElement.lang || "de").slice(0, 2) === "en" ? "en" : "de";

  var msgs = {};
  box.querySelectorAll("[data-nl-msg]").forEach(function (m) {
    msgs[m.getAttribute("data-nl-msg")] = m.textContent.trim();
  });

  // Fields Mailchimp expects. Without JavaScript the browser posts these.
  form.action = cfg.action + "?u=" + encodeURIComponent(cfg.u) + "&id=" + encodeURIComponent(cfg.id);
  topics.forEach(function (t) {
    var name = cfg.groups && cfg.groups[t.getAttribute("data-nl-topic")];
    if (name) { t.name = name; t.value = "1"; }
  });
  honeypot.name = "b_" + cfg.u + "_" + cfg.id;
  if (cfg.languageField) {
    var langInput = document.createElement("input");
    langInput.type = "hidden"; langInput.name = cfg.languageField; langInput.value = lang;
    form.appendChild(langInput);
  }
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
    if (on) { submitBtn.dataset.label = submitBtn.textContent; submitBtn.textContent = msgs.sending; }
    else if (submitBtn.dataset.label) submitBtn.textContent = submitBtn.dataset.label;
  }

  function finish(result) {
    busy(false);
    if (result === "success") {
      form.hidden = true;
      done.hidden = false;
      done.focus();
      return;
    }
    showAlert(msgs[result] || msgs.error);
  }

  // Mailchimp answers with result "success" or "error" and an English message.
  function classify(data) {
    if (data && data.result === "success") return "success";
    var text = String((data && data.msg) || "").toLowerCase();
    if (text.indexOf("already subscribed") > -1) return "already";
    if (text.indexOf("too many") > -1) return "rate";
    if (text.indexOf("email") > -1 && text.indexOf("invalid") > -1) return "email";
    return "error";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showAlert("");
    if (!validate()) return;
    if (honeypot.value) { finish("success"); return; }   // bots: pretend success

    var params = [];
    Array.prototype.forEach.call(form.elements, function (f) {
      if (!f.name || f.disabled) return;
      if (f.type === "checkbox" && !f.checked) return;
      params.push(encodeURIComponent(f.name) + "=" + encodeURIComponent(f.name === "EMAIL" ? f.value.trim() : f.value));
    });

    var cb = "qgzNewsletter" + Date.now();
    var script = document.createElement("script");
    var timer;
    function cleanup() {
      clearTimeout(timer);
      try { delete window[cb]; } catch (err) { window[cb] = undefined; }
      if (script.parentNode) script.parentNode.removeChild(script);
    }
    window[cb] = function (data) {
      cleanup();
      var r = classify(data);
      if (r === "email") { setError("email", true); email.focus(); busy(false); return; }
      finish(r);
    };
    script.onerror = function () { cleanup(); finish("network"); };
    timer = setTimeout(function () { cleanup(); finish("network"); }, 15000);

    busy(true);
    script.src = cfg.action.replace(/\/post$/, "/post-json") +
      "?u=" + encodeURIComponent(cfg.u) + "&id=" + encodeURIComponent(cfg.id) +
      "&" + params.join("&") + "&c=" + cb;
    document.body.appendChild(script);
  });
})();
