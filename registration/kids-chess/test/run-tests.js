/*
 * Offline tests for registration/kids-chess/apps-script/Code.gs.
 * Runs the real script in Node against an in-memory imitation of Google
 * Sheets, MailApp etc. No network, no real emails.
 *
 *   node registration/kids-chess/test/run-tests.js
 */
"use strict";
const assert = require("assert");
const { makeEnv } = require("./mock-apps-script");

function post(env, body) {
  return env.ctx.doPost({ postData: { contents: JSON.stringify(body) } }).body;
}
function get(env, q) { return env.ctx.doGet({ parameter: q }).body; }

let n = 0;
function base(over) {
  n++;
  return Object.assign({
    workshopId: "zollikon-kids-chess-pilot-2026",
    parentFirst: "Anna", parentLast: "Muster", email: "parent" + n + "+test@example.com", phone: "+41 79 123 45 67",
    childFirst: "Lina", childLast: "Muster", age: "8", experience: "beginner",
    sessions: ["2026-10-24"], consent: true, marketing: false, lang: "en",
    website: "", elapsedMs: 9000
  }, over || {});
}
function regRows(env) {
  const sh = env.ss._sheets.Registrations;
  const head = sh._data[0];
  return sh._data.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
function setSetting(env, key, colIndex, value) {
  const d = env.ss._sheets.Settings._data;
  const row = d.find((r) => r[0] === key);
  assert(row, "setting " + key);
  row[colIndex] = value;
}

const results = [];
function test(name, fn) {
  try { fn(); results.push(["PASS", name]); }
  catch (e) { results.push(["FAIL", name + " → " + (e && e.message)]); }
}

// ---------------------------------------------------------------------------
const env = makeEnv();
env.ctx.setup();

test("setup creates Registrations, Settings, Dashboard, Log", () => {
  ["Registrations", "Settings", "Dashboard", "Log"].forEach((s) => assert(env.ss._sheets[s], s));
  const head = env.ss._sheets.Registrations._data[0];
  ["Registration ID", "Parent Phone", "Sat 24 Oct", "Sun 25 Oct", "Sat 31 Oct", "Sessions", "Price", "Registration Status", "Payment Status", "Marketing Consent"]
    .forEach((h) => assert(head.includes(h), h));
  assert.strictEqual(env.ss._sheets.Registrations.getLastRow(), 1, "no empty rows counted");
});

test("Settings: session ids stay text, capacity 18, prices empty, not published", () => {
  const c = env.ctx.readSettings_();
  assert.strictEqual(JSON.stringify(c.capacity), JSON.stringify({ "2026-10-24": 18, "2026-10-25": 18, "2026-10-31": 18 }));
  assert.strictEqual(JSON.stringify(c.price), JSON.stringify({ "2026-10-24": null, "2026-10-25": null, "2026-10-31": null }));
  assert.strictEqual(c.publish, false); assert.strictEqual(c.open, true);
});

test("1. one session: stored, parent + organiser emails, no price", () => {
  const before = env.mails.length;
  const r = post(env, base({ sessions: ["2026-10-24"] }));
  assert.deepStrictEqual([r.ok, r.stored, r.sessions], [true, true, 1]);
  const row = regRows(env).pop();
  assert.strictEqual(row["Sat 24 Oct"], true); assert.strictEqual(row["Sun 25 Oct"], false);
  assert.strictEqual(row["Sessions"], 1); assert.strictEqual(row["Price"], "");
  assert.strictEqual(row["Registration Status"], "Confirmed"); assert.strictEqual(row["Payment Status"], "Open");
  assert.strictEqual(row["Parent Phone"], "+41 79 123 45 67");
  const m = env.mails.slice(before);
  assert.strictEqual(m.length, 2);
  assert(m[0].to.endsWith("+test@example.com") && /Registration confirmed/.test(m[0].subject));
  assert(!/CHF|Total/.test(m[0].body), "no price while unpublished");
  assert(/Saturday, 24 October 2026, 09:30–11:30/.test(m[0].body));
  assert(/Combi Face, Oberdorfstrasse 37, 8702 Zollikon/.test(m[0].body));
  assert.strictEqual(m[1].to, "info@queensgambitzurich.ch");
  assert(/\(1 session\)/.test(m[1].subject) && /Phone: \+41/.test(m[1].body));
});

test("2. two sessions", () => {
  const r = post(env, base({ sessions: ["2026-10-24", "2026-10-31"], childFirst: "Noah" }));
  assert(r.ok);
  const row = regRows(env).pop();
  assert.strictEqual(row["Sessions"], 2); assert.strictEqual(row["Selected Dates"], "Sat 24 Oct, Sat 31 Oct");
});

test("3. all three sessions, German: German email", () => {
  const before = env.mails.length;
  const r = post(env, base({ sessions: ["2026-10-31", "2026-10-25", "2026-10-24"], lang: "de", experience: "intermediate", marketing: true }));
  assert(r.ok);
  const row = regRows(env).pop();
  assert.strictEqual(row["Sessions"], 3); assert.strictEqual(row["Selected Dates"], "Sat 24 Oct, Sun 25 Oct, Sat 31 Oct");
  assert.strictEqual(row["Marketing Consent"], "Yes"); assert.strictEqual(row["Language"], "DE");
  assert.strictEqual(row["Chess Experience"], "Intermediate");
  const m = env.mails[before];
  assert(/^Anmeldebestätigung/.test(m.subject) && /Samstag, 31\. Oktober 2026, 09:00–12:00/.test(m.body) && /3 Termine/.test(m.body));
});

test("duplicate: same parent email + same child is rejected, no email", () => {
  const body = base();
  assert(post(env, body).ok);
  const before = env.mails.length;
  const r = post(env, Object.assign({}, body, { childFirst: " lina ", sessions: ["2026-10-25"] }));
  assert.strictEqual(r.code, "duplicate"); assert.strictEqual(env.mails.length, before);
});

test("sibling with the same parent email is accepted", () => {
  const body = base();
  assert(post(env, body).ok);
  assert(post(env, Object.assign({}, body, { childFirst: "Mia" })).ok);
});

test("validation: missing consent, bad email/phone/age, unknown session, honeypot, too fast", () => {
  const count = regRows(env).length;
  assert.strictEqual(post(env, base({ consent: false })).code, "invalid");
  assert.strictEqual(post(env, base({ email: "nope" })).code, "invalid");
  assert.strictEqual(post(env, base({ phone: "12" })).code, "invalid");
  assert.strictEqual(post(env, base({ age: "4" })).code, "invalid");
  assert.strictEqual(post(env, base({ age: "14" })).code, "invalid");
  assert.strictEqual(post(env, base({ experience: "expert" })).code, "invalid");
  assert.strictEqual(post(env, base({ sessions: [] })).code, "invalid");
  assert.strictEqual(post(env, base({ sessions: ["2026-11-01"] })).code, "invalid");
  assert.strictEqual(post(env, base({ sessions: ["2026-10-24", "2026-10-24"] })).code, "invalid");
  assert.strictEqual(post(env, base({ website: "x" })).code, "invalid");
  assert.strictEqual(post(env, base({ elapsedMs: 500 })).code, "invalid");
  assert.strictEqual(post(env, base({ workshopId: "other" })).code, "closed");
  assert.strictEqual(regRows(env).length, count, "nothing stored");
});

test("formula injection is neutralised", () => {
  assert(post(env, base({ childLast: "=HYPERLINK(1)" })).ok);
  // stored with a leading apostrophe → text, not a formula
  assert.strictEqual(regRows(env).pop()["Child Last Name"], "=HYPERLINK(1)");
  const raw = env.ss._sheets.Registrations._data.slice(-1)[0];
  assert(!raw.some((v) => v && v.formula), "no formula stored");
});

test("availability GET: no personal data, sessions not full, no prices", () => {
  const r = get(env, { workshop: "zollikon-kids-chess-pilot-2026" });
  assert.deepStrictEqual(Object.keys(r).sort(), ["ok", "open", "pricing", "sessions"]);
  assert.strictEqual(r.pricing, null);
  assert.strictEqual(JSON.stringify(r).includes("@"), false);
  assert.strictEqual(get(env, {}).service, "qgz-kids-registration");
});

test("capacity: 18 per session, 19th rejected, other sessions still open", () => {
  const env2 = makeEnv(); env2.ctx.setup();
  for (let i = 0; i < 18; i++) assert(post(env2, base({ sessions: ["2026-10-31"], childFirst: "Kid" + i })).ok, "reg " + i);
  const before = env2.mails.length;
  const r = post(env2, base({ sessions: ["2026-10-24", "2026-10-31"] }));
  assert.strictEqual(r.code, "full"); assert.deepStrictEqual(r.full, ["2026-10-31"]);
  assert.strictEqual(env2.mails.length, before, "no email when full");
  assert(post(env2, base({ sessions: ["2026-10-24"] })).ok, "other session open");
  const a = get(env2, { workshop: "zollikon-kids-chess-pilot-2026" });
  assert.deepStrictEqual(a.sessions, { "2026-10-24": { full: false }, "2026-10-25": { full: false }, "2026-10-31": { full: true } });
  // cancelling one registration frees a place
  const sh = env2.ss._sheets.Registrations, col = sh._data[0].indexOf("Registration Status");
  sh._data[1][col] = "Cancelled";
  assert(post(env2, base({ sessions: ["2026-10-31"] })).ok, "place freed after cancellation");
  // capacity change in Settings applies immediately
  setSetting(env2, "2026-10-24", 2, 1);
  assert.strictEqual(post(env2, base({ sessions: ["2026-10-24"] })).code, "full");
});

test("prices: per session, package, publish switch, fill missing", () => {
  const env3 = makeEnv(); env3.ctx.setup();
  assert(post(env3, base({ sessions: ["2026-10-24", "2026-10-25"] })).ok);   // before prices exist
  setSetting(env3, "2026-10-24", 3, 40); setSetting(env3, "2026-10-25", 3, 40); setSetting(env3, "2026-10-31", 3, 50);
  setSetting(env3, "Package price, 3 sessions", 1, 110);
  let before = env3.mails.length;
  assert(post(env3, base({ sessions: ["2026-10-24", "2026-10-31"] })).ok);
  assert.strictEqual(regRows(env3).pop()["Price"], 90);
  assert(!/CHF/.test(env3.mails[before].body), "unpublished → not in email");
  assert.strictEqual(get(env3, { workshop: "zollikon-kids-chess-pilot-2026" }).pricing, null);
  setSetting(env3, "Publish prices", 1, "Yes");
  before = env3.mails.length;
  assert(post(env3, base({ sessions: ["2026-10-24", "2026-10-25", "2026-10-31"] })).ok);
  assert.strictEqual(regRows(env3).pop()["Price"], 110);
  assert(/Total: CHF 110/.test(env3.mails[before].body));
  assert.deepStrictEqual(get(env3, { workshop: "zollikon-kids-chess-pilot-2026" }).pricing,
    { currency: "CHF", sessions: { "2026-10-24": 40, "2026-10-25": 40, "2026-10-31": 50 }, packages: { 3: 110 } });
  env3.ctx.fillMissingPrices();
  assert.strictEqual(regRows(env3)[0]["Price"], 80);
  assert(/1 price\(s\) filled in/.test(env3.ctx._alert));
});

test("past sessions cannot be booked", () => {
  const env8 = makeEnv(); env8.ctx.setup();
  env8.ctx._today = "2026-10-25";
  assert.strictEqual(post(env8, base({ sessions: ["2026-10-24", "2026-10-31"] })).code, "closed");
  assert(post(env8, base({ sessions: ["2026-10-25", "2026-10-31"] })).ok, "today and later are fine");
});

test("registration closed via Settings", () => {
  const env4 = makeEnv(); env4.ctx.setup();
  setSetting(env4, "Registration open", 1, "No");
  assert.strictEqual(post(env4, base()).code, "closed");
  assert.strictEqual(get(env4, { workshop: "zollikon-kids-chess-pilot-2026" }).open, false);
});

test("setup re-run keeps registrations and settings", () => {
  const env5 = makeEnv(); env5.ctx.setup();
  assert(post(env5, base()).ok);
  setSetting(env5, "2026-10-25", 2, 12); setSetting(env5, "Package price, 2 sessions", 1, 70);
  env5.ctx.setup();
  assert.strictEqual(regRows(env5).length, 1);
  const c = env5.ctx.readSettings_();
  assert.strictEqual(c.capacity["2026-10-25"], 12); assert.strictEqual(c.packages["2"], 70);
});

test("rate limit per email address", () => {
  const env6 = makeEnv(); env6.ctx.setup();
  const codes = [];
  for (let i = 0; i < 10; i++) codes.push(post(env6, base({ email: "same@example.com", childFirst: "K" + i })).ok || post.code);
  assert.strictEqual(post(env6, base({ email: "same@example.com", childFirst: "Z" })).code, "rate");
});

test("test emails go only to the script owner, no rows", () => {
  const env7 = makeEnv(); env7.ctx.setup();
  env7.ctx.testEmails();
  assert.strictEqual(env7.mails.length, 2);
  assert(env7.mails.every((m) => m.to === "owner@example.com"));
  assert.strictEqual(regRows(env7).length, 0);
});

test("dashboard formulas reference the right columns", () => {
  const d = env.ss._sheets.Dashboard._data;
  const flat = d.map((r) => r.map((v) => (v && v.formula) || v));
  const row = (label) => flat.find((r) => String(r[0]).startsWith(label));
  assert(/'Registrations'!Q2:Q<>"Cancelled"/.test(row("Registrations (children)")[1]) || /Registration/.test(row("Registrations (children)")[1]));
  const sat = row("Sat 24 Oct");
  assert(/'Settings'!C5/.test(sat[2]), "capacity from Settings C5: " + sat[2]);
  assert(/MAX\(0,C11-B11\)/.test(sat[3]), sat[3]);
  assert(row("Sat 31 Oct")[2].includes("'Settings'!C7"));
  assert(row("Expected revenue")[2].includes("IFERROR(1*"));
});

test("German email uses the formal Sie form and the event name", () => {
  const e = makeEnv(); e.ctx.setup();
  assert(post(e, base({ lang: "de", parentFirst: "Anna", parentLast: "Muster" })).ok);
  const m = e.mails[0];
  assert(/^Anmeldebestätigung: Zollikon Kids Chess$/.test(m.subject), m.subject);
  assert(/Guten Tag Anna Muster/.test(m.body) && /dass Sie/.test(m.body) && /schreiben Sie an/.test(m.body));
  assert(!/\b(du|dein|dich|dir|schreib|antworte)\b/.test(m.body), "no du-forms");
  assert(/^Zollikon Kids Chess registration: Lina Muster \(1 session\)$/.test(e.mails[1].subject), e.mails[1].subject);
});

test("retention: trigger installed once; dates = last session + 3 months, reminder 7 days before", () => {
  const e = makeEnv(); e.ctx.setup(); e.ctx.setup();
  assert.strictEqual(e.triggers.filter((t) => t === "retentionCheck").length, 1);
  assert.strictEqual(e.ctx.retentionDate_(), "2027-01-31");
  assert.strictEqual(e.ctx.reminderDate_(), "2027-01-24");
  assert(e.ss._sheets["Marketing Contacts"], "Marketing Contacts tab");
});

test("retention: nothing before the date; reminder once; deletion keeps only consenting contacts", () => {
  const e = makeEnv(); e.ctx.setup();
  assert(post(e, base({ email: "yes1@example.com", marketing: true, parentFirst: "Mara", parentLast: "Ja" })).ok);
  assert(post(e, base({ email: "yes1@example.com", marketing: true, childFirst: "Sibling" })).ok);
  assert(post(e, base({ email: "no@example.com", marketing: false })).ok);
  const sent = e.mails.length;
  e.ctx._today = "2027-01-10"; e.ctx.retentionCheck();
  assert.strictEqual(regRows(e).filter((r) => r["Registration ID"]).length, 3, "kept before reminder date");
  assert.strictEqual(e.mails.length, sent);
  e.ctx._today = "2027-01-24"; e.ctx.retentionCheck(); e.ctx.retentionCheck();
  assert.strictEqual(e.mails.length, sent + 1, "one reminder");
  assert(/will be deleted on 2027-01-31/.test(e.mails[sent].subject));
  e.ctx.applyRetentionFromMenu();
  assert.strictEqual(regRows(e).filter((r) => r["Registration ID"]).length, 3, "menu refuses before the date");
  e.ctx._today = "2027-01-31"; e.ctx.retentionCheck();
  assert.strictEqual(regRows(e).filter((r) => Object.values(r).some((v) => v !== "" && v !== undefined)).length, 0, "registrations deleted");
  const mk = e.ss._sheets["Marketing Contacts"]._data;
  assert.strictEqual(mk.length, 2, "header + one contact (deduplicated)");
  assert.deepStrictEqual(mk[1].slice(0, 3), ["Mara", "Ja", "yes1@example.com"]);
  assert(!JSON.stringify(mk).includes("no@example.com") && !JSON.stringify(mk).includes("Lina"), "no child data, no non-consenting parent");
  const log = e.ss._sheets.Log._data.filter((r) => r.some((v) => v !== "" && v !== undefined));
  assert.strictEqual(log.length, 2, "log emptied except header + retention entry");
  assert.strictEqual(e.ctx.readSettings_().open, false, "registration closed");
  assert(/registration data deleted/.test(e.mails[e.mails.length - 1].subject));
  const before = e.mails.length; e.ctx.retentionCheck();
  assert.strictEqual(e.mails.length, before, "runs only once");
});

// ---------------------------------------------------------------------------
results.forEach(([s, t]) => console.log(s + "  " + t));
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
