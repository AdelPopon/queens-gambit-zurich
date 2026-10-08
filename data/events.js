/* ==========================================================================
   Queen's Gambit Zürich: events
   --------------------------------------------------------------------------
   Events are managed manually in this file.

   - Past events disappear automatically (based on each visitor's date).
   - Events are sorted by date automatically; order here does not matter.
   - Use ISO dates: "YYYY-MM-DD".
   - Set a field to null when the information is not confirmed yet; the page
     then shows a clearly marked placeholder.

   Fields
     id          unique text id
     programme   "community" | "kids" | "impact"
     status      optional: "upcoming-pilot" | "in-development" | "planned"
     title       event name
     sessions    list of { date, time, label }  (one entry for single events)
     venue       venue name
     address     street address
     summary     optional short description
     linkKey     optional key from config.js links (e.g. "kidsRegistration")
     linkLabel   optional button text
     price       optional price in CHF (search-engine event data only)

   Sources: Winter Schedule 2026/27 flyer (W26QGflzers.pdf, InstaW26QGZ.png)
            Zollikon Kids Chess email flyer + final pilot overview (Oct 2026)
   ========================================================================== */

(function () {
  // Winter Schedule 2026/27, Robins Caffè.
  // Meet-ups start at fixed times and have no fixed end (members stay as long
  // as they like), so only the start time is shown.
  var START_TIMES = { 5: "From 19:00", 0: "From 15:00" };   // Friday, Sunday
  function startTime(iso) {
    var p = iso.split("-").map(Number);
    return START_TIMES[new Date(p[0], p[1] - 1, p[2]).getDay()] || null;
  }
  var winterDates = [
    "2026-10-09", "2026-10-25", "2026-11-13", "2026-11-29", "2026-12-11",
    "2026-12-27", "2027-01-08", "2027-01-31", "2027-02-12", "2027-02-28",
    "2027-03-12", "2027-03-28", "2027-04-09", "2027-04-25"
  ];

  var communityMeetups = winterDates.map(function (date) {
    return {
      id: "chess-club-" + date,
      programme: "community",
      title: "Chess Club meet-up",
      sessions: [{ date: date, time: startTime(date), label: null }],
      venue: "Robins Caffè",
      address: "Stampfenbachstrasse 38, 8006 Zürich",
      summary: "Winter Schedule 2026/27. All levels welcome."
    };
  });

  var kidsPilot = {
    id: "zollikon-kids-chess-pilot-2026",
    programme: "kids",
    status: "upcoming-pilot",
    title: "Zollikon Kids Chess Pilot",
    sessions: [
      { date: "2026-10-24", time: "09:30–11:30", label: "Learn & Discover" },
      { date: "2026-10-25", time: "09:30–11:30", label: "Practice & Challenge" },
      { date: "2026-10-31", time: "09:00–12:00", label: "Tournament & Awards" }
    ],
    venue: "Combi Face",
    address: "Oberdorfstrasse 37, 8702 Zollikon",
    summary: "Three mornings of chess for children aged 5–13.",
    price: "195",            // CHF, complete programme (used for search-engine event data)
    linkKey: "kidsRegistration",
    linkLabel: "Register"
  };

  window.QGZ_EVENTS = communityMeetups.concat([kidsPilot]);
})();
