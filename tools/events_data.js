/* Used by tools/build.py (needs Node.js): reads data/events.js and prints, as
   JSON, the event data for search engines (same function as the website,
   js/event-schema.js) plus a plain list of upcoming dates.

   node tools/events_data.js <lang> <YYYY-MM-DD today> [<event id> <page url>] */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const [lang, todayIso, only, pageUrl] = process.argv.slice(2);
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, "data/config.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(root, "data/events.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(root, "js/event-schema.js"), "utf8"), ctx);
const W = ctx.window;

const p = todayIso.split("-").map(Number);
const today = new Date(p[0], p[1] - 1, p[2]);
const events = W.QGZ_EVENTS;
const L = (v) => (v == null ? v : typeof v === "object" ? v[lang] || v.en : v);
const locale = lang === "en" ? "en-GB" : "de-CH";
const day = (iso) => {
  const q = iso.split("-").map(Number);
  return new Date(q[0], q[1] - 1, q[2]).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const config = W.QGZ_CONFIG;
const schema = W.QGZ_buildEventSchema(events, { lang, today, config, only: only || null, pageUrl: pageUrl || null });

const list = [];
W.QGZ_upcomingEvents(events, today, config).forEach(({ ev }) => {
  ev.sessions.forEach((s) => {
    const q = s.date.split("-").map(Number);
    if (new Date(q[0], q[1] - 1, q[2]) < today) return;
    list.push({
      iso: s.date,
      date: day(s.date),
      time: L(s.time) || "",
      title: L(ev.title) + (L(s.label) ? ": " + L(s.label) : ""),
      place: ev.venue + (ev.address ? ", " + ev.address : ""),
    });
  });
});

list.sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
process.stdout.write(JSON.stringify({ schema, list }));
