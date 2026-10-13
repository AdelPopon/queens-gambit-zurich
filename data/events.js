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
     status      optional: "workshop" | "upcoming-pilot" | "in-development" | "planned"
     Any text field can be one string (same in both languages) or
     { en: "…", de: "…" } for English and German.

     title       event name
     sessions    list of { date, time, label }  (one entry for single events)
     venue       venue name
     address     street address
     summary     optional short description
     linkKey     optional key from config.js links (e.g. "kidsRegistration")
     linkLabel   optional button text
     coach       optional coach name, shown on the event card
     special     optional true: shows the "Special event" badge instead of the programme
     partners    optional list of { name, url }: each name in the title becomes a
                 link to the partner's official website (opens in a new tab)
     price       optional price in CHF (search-engine event data only)
     admission   optional text shown on the card, e.g. free admission
     schedule    optional list of { time, item, duration }: the event programme,
                 shown in an expandable "View programme" panel
     registration optional true: shows the "Register for free" button, which
                 opens the registration form (only once a registration
                 endpoint is set in config.js)

   Sources: Winter Schedule 2026/27 flyer (W26QGflzers.pdf, InstaW26QGZ.png)
            Zollikon Kids Chess email flyer + final pilot overview (Oct 2026)
   ========================================================================== */

(function () {
  // Winter Schedule 2026/27, Robins Caffè.
  // Meet-ups start at fixed times and have no fixed end (members stay as long
  // as they like), so only the start time is shown.
  var START_TIMES = {                                        // Friday, Sunday
    5: { en: "From 19:00", de: "Ab 19:00" },
    0: { en: "From 15:00", de: "Ab 15:00" }
  };
  function startTime(iso) {
    var p = iso.split("-").map(Number);
    return START_TIMES[new Date(p[0], p[1] - 1, p[2]).getDay()] || null;
  }
  var winterDates = [
    "2026-10-09", "2026-10-25", "2026-11-13", "2026-11-29", "2026-12-11",
    "2026-12-27", "2027-01-08", "2027-01-31", "2027-02-12", "2027-02-28",
    "2027-03-12", "2027-03-28", "2027-04-09", "2027-04-25"
  ];

  // Formats: Fridays are Free Play (informal social chess); Sundays are
  // Coaching Sessions led by Sinan Deveci. Special dates are listed below.
  var FORMATS = {
    5: {
      title: { en: "Free Play", de: "Freies Spiel" },
      summary: { en: "Informal social chess. Winter Schedule 2026/27. All levels welcome.",
                 de: "Lockeres, geselliges Schach. Winterprogramm 2026/27. Alle Spielstärken willkommen." }
    },
    0: {
      title: { en: "Coaching Session", de: "Coaching-Session" }, coach: "Sinan Deveci",
      summary: { en: "Guided chess session with our coach. Winter Schedule 2026/27. All levels welcome.",
                 de: "Angeleitete Schachsession mit unserem Coach. Winterprogramm 2026/27. Alle Spielstärken willkommen." }
    }
  };
  var SPECIAL = {
    "2026-11-29": {
      title: "QGZ × WINZ | Beyond the Chessboard",
      special: true,
      time: { en: "From 13:00", de: "Ab 13:00" },
      venue: "ROBIN’S",
      admission: { en: "Free admission", de: "Eintritt frei" },
      registration: true,
      partners: [{ name: "WINZ", url: "https://www.ifi.uzh.ch/en/winz.html" }],
      schedule: [
        { time: "13:00–13:15", duration: "15 min",
          item: { en: "Welcome & Opening Remarks", de: "Begrüssung & Eröffnungsworte" } },
        { time: "13:15–13:45", duration: "30 min",
          item: { en: "Panel Discussion: What Makes Us Feel That a Space Is Also for Us?",
                  de: "Podiumsdiskussion: Was gibt uns das Gefühl, dass ein Ort auch für uns da ist?" } },
        { time: "13:45–14:00", duration: "15 min",
          item: { en: "Audience Q&A", de: "Fragen aus dem Publikum" } },
        { time: "14:00–15:00", duration: "60 min",
          item: { en: "Open Chess & Social Hour", de: "Offenes Schach & Austausch" } },
        { time: "15:00–15:15", duration: "15 min",
          item: { en: "Blitz Tournament Check-in & Final Pairings", de: "Check-in Blitzturnier & finale Paarungen" } },
        { time: "15:15–17:30", duration: "2 h 15 min",
          item: { en: "Jazz & Chess: 7-Round Blitz Tournament (5+0), including a 15-minute break",
                  de: "Jazz & Schach: Blitzturnier über 7 Runden (5+0), inklusive 15 Minuten Pause" } },
        { time: "17:30–17:45", duration: "15 min",
          item: { en: "Awards Ceremony", de: "Preisverleihung" } },
        { time: { en: "17:45 onwards", de: "Ab 17:45" }, duration: { en: "Open-ended", de: "Offenes Ende" },
          item: { en: "Stay, Play & Connect", de: "Bleiben, spielen & vernetzen" } }
      ]
    }
  };
  function weekday(iso) { var p = iso.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]).getDay(); }

  var communityMeetups = winterDates.map(function (date) {
    var f = SPECIAL[date] || FORMATS[weekday(date)] || {
      title: { en: "Chess Club meet-up", de: "Schachtreff" },
      summary: { en: "Winter Schedule 2026/27. All levels welcome.", de: "Winterprogramm 2026/27. Alle Spielstärken willkommen." }
    };
    return {
      id: "chess-club-" + date,
      programme: "community",
      title: f.title,
      coach: f.coach || null,
      special: !!f.special,
      partners: f.partners || null,
      sessions: [{ date: date, time: f.time || startTime(date), label: null }],
      venue: f.venue || "Robins Caffè",
      address: "Stampfenbachstrasse 38, 8006 Zürich",
      summary: f.summary || null,
      admission: f.admission || null,
      schedule: f.schedule || null,
      registration: !!f.registration
    };
  });

  var kidsPilot = {
    id: "zollikon-kids-chess-pilot-2026",
    programme: "kids",
    status: "workshop",
    title: "Zollikon Kids Chess Workshop",
    sessions: [
      { date: "2026-10-24", time: "09:30–11:30", label: { en: "Learn & Discover", de: "Lernen & Entdecken" } },
      { date: "2026-10-25", time: "09:30–11:30", label: { en: "Practice & Challenge", de: "Üben & Herausfordern" } },
      { date: "2026-10-31", time: "09:00–12:00", label: { en: "Tournament & Awards", de: "Turnier & Preisverleihung" } }
    ],
    venue: "Combi Face",
    address: "Oberdorfstrasse 37, 8702 Zollikon",
    summary: { en: "Three mornings of chess for children aged 5–13.", de: "Drei Schachvormittage für Kinder von 5 bis 13 Jahren." },
    linkKey: "kidsRegistration",
    linkLabel: { en: "Register", de: "Anmelden" }
  };

  window.QGZ_EVENTS = communityMeetups.concat([kidsPilot]);
})();
