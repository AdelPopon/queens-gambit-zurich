/* ==========================================================================
   Queen's Gambit Zürich: event data for search engines (schema.org)
   --------------------------------------------------------------------------
   One function, used in two places so the data is always built the same way:
   - in the browser by js/site.js (always up to date with the visitor's date)
   - by tools/build.py (Node) to write the same data into the HTML, so search
     and AI tools that do not run JavaScript can read it as well.
   Only facts that are shown on the website are included.
   ========================================================================== */
(function (root) {
  "use strict";
  var SITE = "https://queensgambitzurich.ch/";

  function parseDate(iso) { var p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function zurichOffset(d) {           // CET/CEST: last Sunday of March to last Sunday of October
    var y = d.getFullYear();
    var lastSunday = function (m) { var x = new Date(y, m + 1, 0); x.setDate(x.getDate() - x.getDay()); return x; };
    return (d >= lastSunday(2) && d < lastSunday(9)) ? "+02:00" : "+01:00";
  }
  function isoAt(dateStr, hhmm) {
    if (hhmm.length === 4) hhmm = "0" + hhmm;
    return dateStr + "T" + hhmm + ":00" + zurichOffset(parseDate(dateStr));
  }

  /* Registration still open on the website (WINZ-style form or a configured link)? */
  function registrationOpen(ev, config) {
    if (!config) return false;
    if (ev.registration && config.registration && config.registration.endpoint) return true;
    return !!(ev.linkKey && config.links && config.links[ev.linkKey] &&
      !(config.closedLinks && config.closedLinks[ev.linkKey]));
  }

  /* Listed under "Upcoming": the event has a session today or later and has not
     started yet. An event with several dates disappears once its first date has
     passed, unless its registration is still open. */
  function isListed(ev, today, config) {
    var dates = ev.sessions.map(function (s) { return parseDate(s.date); });
    var hasNext = dates.some(function (d) { return d >= today; });
    return hasNext && (dates[0] >= today || registrationOpen(ev, config));
  }

  /* Upcoming events, sorted by date. */
  function upcoming(events, today, config) {
    return events
      .filter(function (ev) { return isListed(ev, today, config); })
      .map(function (ev) {
        var dates = ev.sessions.map(function (s) { return parseDate(s.date); });
        return { ev: ev, next: dates.filter(function (d) { return d >= today; })[0] };
      })
      .sort(function (a, b) { return a.next - b.next; });
  }

  /* opts: { lang: "de" | "en", today: Date, only: event id (optional), pageUrl: (optional) } */
  function buildEventSchema(events, opts) {
    var lang = opts.lang || "de";
    var L = function (v) { return v == null ? v : (typeof v === "object" ? (v[lang] || v.en) : v); };
    var times = function (t) { return (L(t) || "").match(/\d{1,2}:\d{2}/g) || []; };
    var home = SITE + (lang === "en" ? "en/" : "");
    var list = opts.only
      ? events.filter(function (ev) { return ev.id === opts.only; }).map(function (ev) { return { ev: ev }; })
      : upcoming(events, opts.today, opts.config);

    return list.map(function (item) {
      var ev = item.ev, first = ev.sessions[0], last = ev.sessions[ev.sessions.length - 1];
      var t0 = times(first.time), t1 = times(last.time);
      var parts = (ev.address || "").match(/^(.*),\s*(\d{4})\s+(.*)$/) || [];
      var url = opts.pageUrl || (home + "#" + (ev.programme === "kids" ? "kids" : "upcoming"));
      var place = { "@type": "Place", "name": (ev.place && ev.place.name) || ev.venue };
      if (ev.place && ev.place.name && ev.place.name !== ev.venue) place.alternateName = ev.venue;
      if (ev.place && ev.place.url) place.url = ev.place.url;
      place.address = { "@type": "PostalAddress", "streetAddress": parts[1] || ev.address,
        "postalCode": parts[2], "addressLocality": parts[3], "addressCountry": "CH" };

      var obj = {
        "@type": "Event",
        "name": ev.programme === "community" && !ev.special ? (lang === "de" ? "Queen's Gambit Zürich Schachclub: " : "Queen's Gambit Zürich Chess Club: ") + L(ev.title) : L(ev.title),
        "startDate": t0.length ? isoAt(first.date, t0[0]) : first.date,
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": place,
        "organizer": { "@type": "SportsOrganization", "@id": SITE + "#organization", "name": "Queen's Gambit Zürich", "url": SITE },
        "url": url,
        "inLanguage": lang
      };
      if (L(ev.summary)) obj.description = L(ev.summary);
      if (t1.length > 1) obj.endDate = isoAt(last.date, t1[1]);
      if (ev.coach) obj.performer = { "@type": "Person", "name": ev.coach };
      obj.image = SITE + (ev.programme === "kids"
        ? "assets/photos/kids-chess-illustration.jpg"
        : "assets/photos/club-evening-boards-2025-11.jpg");
      if (ev.admission || ev.free) obj.isAccessibleForFree = true;
      if (ev.registrationPage) {
        obj.offers = { "@type": "Offer", "price": "0", "priceCurrency": "CHF",
          "availability": "https://schema.org/InStock", "url": SITE + (lang === "en" ? "en/" : "") + ev.registrationPage };
      }
      return obj;
    });
  }

  root.QGZ_upcomingEvents = upcoming;
  root.QGZ_isListed = isListed;
  root.QGZ_buildEventSchema = buildEventSchema;
})(typeof window !== "undefined" ? window : globalThis);
