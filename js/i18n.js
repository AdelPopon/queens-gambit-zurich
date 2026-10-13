/* ==========================================================================
   Queen's Gambit Zürich: interface translations (EN / DE)
   --------------------------------------------------------------------------
   The page language comes from <html lang="…">: English pages live at /,
   German pages at /de/. Static page text is translated in i18n/de.json and
   built into /de/ by tools/build.py; this file holds the text that the
   scripts create (event cards, buttons, messages).

   German follows Swiss Standard German (ss, never ß).

   Usage in scripts:
     QGZ_T("key", { n: 3 })   → translated UI string with {n} filled in
     QGZ_L(value)             → value.en / value.de, or the value itself
   ========================================================================== */
(function () {
  "use strict";

  var LANG = (document.documentElement.lang || "en").slice(0, 2) === "de" ? "de" : "en";

  var STRINGS = {
    en: {
      locale: "en-GB",
      menu: "Menu",
      close: "Close",
      "programme.community": "Chess Club",
      "programme.kids": "Kids Chess",
      "programme.impact": "Social Impact",
      "status.workshop": "Workshop",
      "status.upcoming-pilot": "Upcoming pilot",
      "status.in-development": "In development",
      "status.planned": "Planned",
      specialEvent: "Special event",
      sessions: "{n} sessions",
      coach: "Coach",
      details: "Details",
      more: "More",
      showAll: "Show all {n} dates",
      showFewer: "Show fewer dates",
      nextClub: "Next chess club:",
      opensNewTab: "{name} (opens in a new tab)",
      viewProgramme: "View programme",
      viewDetails: "View details",
      viewDates: "View dates",
      hideDates: "Hide dates",
      hideDetails: "Hide details",
      hideProgramme: "Hide programme",
      programmeTime: "Time",
      programmeItem: "Programme",
      programmeDuration: "Duration",
      registerFree: "Register for free",
      emailCopied: "Email address copied.",
      emailSelected: "Email address selected. Copy it with your keyboard or menu."
    },
    de: {
      locale: "de-CH",
      menu: "Menü",
      close: "Schliessen",
      "programme.community": "Schachclub",
      "programme.kids": "Kinderschach",
      "programme.impact": "Soziales Engagement",
      "status.workshop": "Workshop",
      "status.upcoming-pilot": "Pilotprojekt",
      "status.in-development": "In Entwicklung",
      "status.planned": "Geplant",
      specialEvent: "Spezialanlass",
      sessions: "{n} Termine",
      coach: "Coach",
      details: "Details",
      more: "Mehr",
      showAll: "Alle {n} Termine anzeigen",
      showFewer: "Weniger Termine anzeigen",
      nextClub: "Nächster Schachtreff:",
      opensNewTab: "{name} (öffnet in einem neuen Tab)",
      viewProgramme: "Programm anzeigen",
      viewDetails: "Details anzeigen",
      viewDates: "Termine anzeigen",
      hideDates: "Termine ausblenden",
      hideDetails: "Details ausblenden",
      hideProgramme: "Programm ausblenden",
      programmeTime: "Zeit",
      programmeItem: "Programm",
      programmeDuration: "Dauer",
      registerFree: "Kostenlos anmelden",
      emailCopied: "E-Mail-Adresse kopiert.",
      emailSelected: "E-Mail-Adresse markiert. Kopiere sie mit der Tastatur oder über das Menü."
    }
  };

  window.QGZ_LANG = LANG;
  window.QGZ_T = function (key, vars) {
    var s = (STRINGS[LANG] && STRINGS[LANG][key]) || STRINGS.en[key] || key;
    if (vars) Object.keys(vars).forEach(function (k) { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  };
  window.QGZ_L = function (value) {
    if (value && typeof value === "object" && !Array.isArray(value) && ("en" in value || "de" in value)) {
      return value[LANG] != null ? value[LANG] : value.en;
    }
    return value;
  };
})();
