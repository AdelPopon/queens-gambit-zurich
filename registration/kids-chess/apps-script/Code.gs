/**
 * Queen's Gambit Zürich · Kids Chess workshop registration (Google Apps Script)
 * ------------------------------------------------------------------------
 * A separate script and Sheet from the QGZ × WINZ event registration
 * (registration/apps-script). It shares the same safeguards, adds flexible
 * session booking, per-session capacity, configurable prices and a dashboard.
 *
 * Order of operations (so a parent never sees a false confirmation):
 *   1. validate input and spam checks
 *   2. lock; reject duplicates (same parent email + same child) and full
 *      sessions; append the row
 *   3. read the row back to confirm it was stored
 *   4. only then email the parent and the organisers
 *   5. answer { ok: true, stored: true }; any failure before step 3 answers
 *      { ok: false, code } and sends no email.
 *
 * Public endpoints:
 *   POST  a registration                    → { ok, code? }
 *   GET   ?workshop=<id>                    → which sessions are full, and the
 *         prices only once "Publish prices" is Yes. Never personal data.
 *
 * Prices, capacity and "registration open" are set in the Settings tab of the
 * Sheet, not here. Setup instructions: registration/kids-chess/README.md
 */

var SETTINGS = {
  SHEET_NAME: 'Registrations',
  DASHBOARD_SHEET: 'Dashboard',
  SETTINGS_SHEET: 'Settings',
  LOG_SHEET: 'Log',
  MARKETING_SHEET: 'Marketing Contacts',
  RETENTION_MONTHS: 3,        // registrations are deleted this long after the last session
  REMINDER_DAYS: 7,           // organisers are reminded this many days before
  ADMIN_EMAIL: 'info@queensgambitzurich.ch',
  REPLY_TO: 'info@queensgambitzurich.ch',
  SENDER_NAME: "Queen's Gambit Zürich · Kids Chess",
  DEFAULT_CAPACITY: 18,       // used by setup() for new Settings rows
  MIN_FILL_MS: 4000,          // faster submissions are treated as bots
  MAX_PER_HOUR: 60,           // overall limit across all visitors
  MAX_PER_EMAIL_HOUR: 8       // repeated attempts with the same email (siblings need several)
};

/*
 * The workshop this Sheet belongs to. The id and session ids must match the
 * event in data/events.js (id, sessions[].date). For a future workshop, make
 * a copy of the Sheet (the script is copied with it), edit this block, run
 * setup and deploy the copy as a new web app.
 */
var WORKSHOP = {
  id: 'zollikon-kids-chess-pilot-2026',
  open: true,
  minAge: 5,
  maxAge: 13,
  title: { en: 'Zollikon Kids Chess', de: 'Zollikon Kids Chess' },
  location: 'Combi Face, Oberdorfstrasse 37, 8702 Zollikon',
  sessions: [
    { id: '2026-10-24', column: 'Sat 24 Oct', time: '09:30–11:30',
      en: { date: 'Saturday, 24 October 2026', label: 'Learn & Discover' },
      de: { date: 'Samstag, 24. Oktober 2026', label: 'Lernen & Entdecken' } },
    { id: '2026-10-25', column: 'Sun 25 Oct', time: '09:30–11:30',
      en: { date: 'Sunday, 25 October 2026', label: 'Practice & Challenge' },
      de: { date: 'Sonntag, 25. Oktober 2026', label: 'Üben & Herausfordern' } },
    { id: '2026-10-31', column: 'Sat 31 Oct', time: '09:00–12:00',
      en: { date: 'Saturday, 31 October 2026', label: 'Tournament & Awards' },
      de: { date: 'Samstag, 31. Oktober 2026', label: 'Turnier & Preisverleihung' } }
  ]
};

var EXPERIENCE = { beginner: 'Beginner', intermediate: 'Intermediate' };
var EXPERIENCE_LABELS = {
  en: { beginner: 'Beginner', intermediate: 'Intermediate' },
  de: { beginner: 'Anfänger/in', intermediate: 'Fortgeschritten' }
};
var STATUS = { confirmed: 'Confirmed', cancelled: 'Cancelled' };
var PAYMENT = ['Open', 'Paid', 'Refunded'];

function headers_() {
  return ['Registration ID', 'Registration Date',
    'Parent First Name', 'Parent Last Name', 'Parent Email', 'Parent Phone',
    'Child First Name', 'Child Last Name', 'Child Age', 'Chess Experience']
    .concat(WORKSHOP.sessions.map(function (s) { return s.column; }))
    .concat(['Sessions', 'Selected Dates', 'Price', 'Registration Status', 'Payment Status',
      'Marketing Consent', 'Language', 'Notes']);
}

/* ---------------------------------------------------------------------- */

function doPost(e) {
  var input;
  try {
    input = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply_({ ok: false, code: 'invalid' });
  }

  var check = validate_(input);
  if (!check.ok) {
    if (check.code !== 'spam') log_('rejected', check.code + (check.field ? ' (' + check.field + ')' : ''), input && input.email);
    return reply_({ ok: false, code: check.code === 'spam' ? 'invalid' : check.code });
  }
  var r = check.value;

  if (!rateLimit_(r.email)) {
    log_('rejected', 'rate', r.email);
    return reply_({ ok: false, code: 'rate' });
  }

  var lock = LockService.getScriptLock();
  var stored = false;
  var timestamp = new Date();
  var conf;
  try {
    conf = readSettings_();
  } catch (err) {
    log_('error', 'settings: ' + err, r.email);
    return reply_({ ok: false, code: 'server' });
  }
  if (!conf.open) return reply_({ ok: false, code: 'closed' });
  r.price = priceFor_(conf, r.sessions);
  try {
    lock.waitLock(20000);
    var sheet = sheet_();
    var col = columnMap_(sheet);
    var rows = dataRows_(sheet);

    if (isDuplicate_(rows, col, r)) {
      log_('rejected', 'duplicate', r.email);
      return reply_({ ok: false, code: 'duplicate' });
    }
    var counts = countBySession_(rows, col);
    var full = r.sessions.filter(function (id) { return counts[id] >= conf.capacity[id]; });
    if (full.length) {
      log_('rejected', 'full: ' + full.join(', '), r.email);
      return reply_({ ok: false, code: 'full', full: full });
    }

    r.id = registrationId_(timestamp);
    sheet.appendRow(rowFor_(sheet, col, r, timestamp));
    SpreadsheetApp.flush();
    var last = sheet.getLastRow();
    stored = String(sheet.getRange(last, col['Registration ID']).getValue()) === r.id;
  } catch (err) {
    log_('error', 'storage: ' + err, r.email);
    return reply_({ ok: false, code: 'server' });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
  if (!stored) {
    log_('error', 'storage: row not confirmed', r.email);
    return reply_({ ok: false, code: 'server' });
  }

  var mailOk = true;
  try {
    sendConfirmation_(r, conf);
  } catch (err) {
    mailOk = false;
    log_('error', 'confirmation email: ' + err, r.email);
  }
  try {
    sendAdminNotice_(r, timestamp, conf);
  } catch (err) {
    log_('error', 'admin email: ' + err, r.email);
  }
  log_('registered', r.id + ' · ' + r.sessions.length + ' session(s)' + (mailOk ? '' : ' (confirmation email failed)'), r.email);
  return reply_({ ok: true, stored: true, emailSent: mailOk, sessions: r.sessions.length });
}

/*
 * Availability for the website: whether each session is full, whether
 * registration is open, and the prices only when published. No personal data.
 */
function doGet(e) {
  var id = e && e.parameter && e.parameter.workshop;
  if (!id) return reply_({ ok: true, service: 'qgz-kids-registration' });
  if (id !== WORKSHOP.id) return reply_({ ok: false, code: 'unknown' });
  try {
    var conf = readSettings_();
    var sheet = sheet_();
    var counts = countBySession_(dataRows_(sheet), columnMap_(sheet));
    var sessions = {};
    WORKSHOP.sessions.forEach(function (s) { sessions[s.id] = { full: counts[s.id] >= conf.capacity[s.id] }; });
    return reply_({ ok: true, open: conf.open, sessions: sessions, pricing: conf.publish ? publicPricing_(conf) : null });
  } catch (err) {
    log_('error', 'availability: ' + err, '');
    return reply_({ ok: false, code: 'server' });
  }
}

/* ---------------------------------------------------------------------- */

function validate_(x) {
  if (!x || typeof x !== 'object') return { ok: false, code: 'invalid' };
  if (x.website) return { ok: false, code: 'spam' };                                    // honeypot
  if (!(Number(x.elapsedMs) >= SETTINGS.MIN_FILL_MS)) return { ok: false, code: 'spam' }; // too fast
  if (x.workshopId !== WORKSHOP.id || !WORKSHOP.open) return { ok: false, code: 'closed' };
  if (x.consent !== true) return { ok: false, code: 'invalid', field: 'consent' };

  var clean = function (v, max) { v = String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); return v.length > max ? null : v; };
  var v = {
    workshopId: WORKSHOP.id,
    parentFirst: clean(x.parentFirst, 60), parentLast: clean(x.parentLast, 60),
    email: clean(x.email, 254), phone: clean(x.phone, 30),
    childFirst: clean(x.childFirst, 60), childLast: clean(x.childLast, 60),
    age: String(x.age == null ? '' : x.age).trim(),
    experience: String(x.experience || ''),
    marketing: x.marketing === true,
    lang: x.lang === 'de' ? 'de' : 'en'
  };
  var names = ['parentFirst', 'parentLast', 'childFirst', 'childLast'];
  for (var i = 0; i < names.length; i++) {
    if (!v[names[i]] || v[names[i]].length < 1 || !/\p{L}/u.test(v[names[i]])) return { ok: false, code: 'invalid', field: names[i] };
  }
  if (!v.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email)) return { ok: false, code: 'invalid', field: 'email' };
  if (!v.phone || !/^\+?[0-9 ()\/.\-]{6,25}$/.test(v.phone) || v.phone.replace(/\D/g, '').length < 7) return { ok: false, code: 'invalid', field: 'phone' };
  if (!/^\d{1,2}$/.test(v.age) || +v.age < WORKSHOP.minAge || +v.age > WORKSHOP.maxAge) return { ok: false, code: 'invalid', field: 'age' };
  v.age = Number(v.age);
  if (!EXPERIENCE[v.experience]) return { ok: false, code: 'invalid', field: 'experience' };

  if (!Array.isArray(x.sessions)) return { ok: false, code: 'invalid', field: 'sessions' };
  var known = WORKSHOP.sessions.map(function (s) { return s.id; });
  var picked = known.filter(function (id) { return x.sessions.indexOf(id) >= 0; });   // known ids, workshop order, no repeats
  if (!picked.length || picked.length !== x.sessions.length) return { ok: false, code: 'invalid', field: 'sessions' };
  var today = Utilities.formatDate(new Date(), 'Europe/Zurich', 'yyyy-MM-dd');
  if (picked.some(function (id) { return id < today; })) return { ok: false, code: 'closed', field: 'past session' };
  v.sessions = picked;
  return { ok: true, value: v };
}

function rateLimit_(email) {
  var cache = CacheService.getScriptCache();
  var hour = Utilities.formatDate(new Date(), 'Etc/UTC', 'yyyyMMddHH');
  var keys = ['all:' + hour, 'mail:' + hour + ':' + email.toLowerCase()];
  var limits = [SETTINGS.MAX_PER_HOUR, SETTINGS.MAX_PER_EMAIL_HOUR];
  for (var i = 0; i < keys.length; i++) {
    var n = Number(cache.get(keys[i]) || 0) + 1;
    if (n > limits[i]) return false;
    cache.put(keys[i], String(n), 3600);
  }
  return true;
}

/* ----- Sheet access ----- */

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS.SHEET_NAME);
  if (!sheet) { setup(); sheet = ss.getSheetByName(SETTINGS.SHEET_NAME); }
  return sheet;
}

// Header name → column number (1-based). Organisers may add columns at the end.
function columnMap_(sheet) {
  var head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  head.forEach(function (h, i) { if (h !== '') map[String(h)] = i + 1; });
  headers_().forEach(function (h) { if (!map[h]) throw new Error('Missing column "' + h + '". Run setup.'); });
  return map;
}

function dataRows_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  return sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
}

function isActive_(row, col) {
  return String(row[col['Registration Status'] - 1]).trim().toLowerCase() !== STATUS.cancelled.toLowerCase();
}

function isTicked_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }

function countBySession_(rows, col) {
  var counts = {};
  WORKSHOP.sessions.forEach(function (s) { counts[s.id] = 0; });
  rows.forEach(function (row) {
    if (!isActive_(row, col)) return;
    WORKSHOP.sessions.forEach(function (s) { if (isTicked_(row[col[s.column] - 1])) counts[s.id]++; });
  });
  return counts;
}

// Same parent email and same child name, not cancelled. Siblings are allowed.
function isDuplicate_(rows, col, r) {
  var key = function (s) { return String(s).replace(/^'/, '').trim().toLowerCase(); };
  return rows.some(function (row) {
    return isActive_(row, col) &&
      key(row[col['Parent Email'] - 1]) === key(r.email) &&
      key(row[col['Child First Name'] - 1]) === key(r.childFirst) &&
      key(row[col['Child Last Name'] - 1]) === key(r.childLast);
  });
}

function rowFor_(sheet, col, r, timestamp) {
  var row = [];
  for (var i = 0; i < sheet.getLastColumn(); i++) row.push('');
  var set = function (name, value) { row[col[name] - 1] = value; };
  set('Registration ID', r.id);
  set('Registration Date', timestamp);
  set('Parent First Name', safe_(r.parentFirst));
  set('Parent Last Name', safe_(r.parentLast));
  set('Parent Email', safe_(r.email));
  set('Parent Phone', "'" + r.phone);          // keep leading + and 0 as text
  set('Child First Name', safe_(r.childFirst));
  set('Child Last Name', safe_(r.childLast));
  set('Child Age', r.age);
  set('Chess Experience', EXPERIENCE[r.experience]);
  WORKSHOP.sessions.forEach(function (s) { set(s.column, r.sessions.indexOf(s.id) >= 0); });
  set('Sessions', r.sessions.length);
  set('Selected Dates', r.sessions.map(function (id) { return sessionById_(id).column; }).join(', '));
  set('Price', r.price == null ? '' : r.price);
  set('Registration Status', STATUS.confirmed);
  set('Payment Status', PAYMENT[0]);
  set('Marketing Consent', r.marketing ? 'Yes' : 'No');
  set('Language', r.lang.toUpperCase());
  return row;
}

function registrationId_(d) {
  return 'KC-' + Utilities.formatDate(d, 'Europe/Zurich', 'MMdd') + '-' +
    Utilities.getUuid().replace(/-/g, '').slice(0, 5).toUpperCase();
}

function sessionById_(id) {
  return WORKSHOP.sessions.filter(function (s) { return s.id === id; })[0];
}

/* ----- Settings tab: capacity, prices, open/closed ----- */

function readSettings_() {
  var conf = { open: WORKSHOP.open, publish: false, currency: 'CHF', capacity: {}, price: {}, packages: {} };
  WORKSHOP.sessions.forEach(function (s) { conf.capacity[s.id] = SETTINGS.DEFAULT_CAPACITY; conf.price[s.id] = null; });
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS.SETTINGS_SHEET);
  if (!sh) return conf;
  var values = sh.getRange(1, 1, Math.max(sh.getLastRow(), 1), 4).getValues();
  var num = function (v) { return v === '' || v === null || isNaN(Number(v)) ? null : Number(v); };
  var yes = function (v) { return v === true || /^(yes|ja|true)$/i.test(String(v).trim()); };
  values.forEach(function (row) {
    var key = String(row[0]).trim();
    var s = sessionById_(key);
    if (s) {
      var cap = num(row[2]);
      conf.capacity[s.id] = cap == null ? SETTINGS.DEFAULT_CAPACITY : cap;
      conf.price[s.id] = num(row[3]);
    } else if (key === 'Registration open') conf.open = conf.open && yes(row[1]);
    else if (key === 'Publish prices') conf.publish = yes(row[1]);
    else if (key === 'Currency' && String(row[1]).trim()) conf.currency = String(row[1]).trim();
    else {
      var m = key.match(/^Package price, (\d+) sessions$/);
      if (m) conf.packages[m[1]] = num(row[1]);
    }
  });
  return conf;
}

// Package price for this number of sessions if set; otherwise the sum of the
// session prices; null while any needed price is missing.
function priceFor_(conf, sessionIds) {
  var pkg = conf.packages[String(sessionIds.length)];
  if (pkg != null) return pkg;
  var total = 0;
  for (var i = 0; i < sessionIds.length; i++) {
    var p = conf.price[sessionIds[i]];
    if (p == null) return null;
    total += p;
  }
  return total;
}

function publicPricing_(conf) {
  var byCount = {};
  for (var n = 1; n <= WORKSHOP.sessions.length; n++) {
    if (conf.packages[String(n)] != null) byCount[n] = conf.packages[String(n)];
  }
  var sessions = {};
  WORKSHOP.sessions.forEach(function (s) { if (conf.price[s.id] != null) sessions[s.id] = conf.price[s.id]; });
  return { currency: conf.currency, sessions: sessions, packages: byCount };
}

function money_(conf, amount) {
  return conf.currency + ' ' + (Math.round(amount * 100) % 100 ? amount.toFixed(2) : String(Math.round(amount)));
}

/* ----- helpers ----- */

// Prevent spreadsheet formula injection ("=", "+", "-", "@" at the start).
function safe_(v) {
  v = String(v);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function log_(kind, detail, email) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = ss.getSheetByName(SETTINGS.LOG_SHEET) || ss.insertSheet(SETTINGS.LOG_SHEET);
    if (log.getLastRow() === 0) log.appendRow(['Time', 'Type', 'Detail', 'Email (masked)']);
    log.appendRow([new Date(), kind, String(detail).slice(0, 500), mask_(email)]);
  } catch (err) {
    console.error('log failed: ' + err);
  }
  if (kind === 'error') console.error(kind + ': ' + detail);
}

function mask_(email) {
  email = String(email || '');
  var at = email.indexOf('@');
  return at > 1 ? email.charAt(0) + '***' + email.slice(at) : (email ? '***' : '');
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ---------------------------------------------------------------------- */
/* Data retention (Privacy Policy, section 5)                             */
/*
 * Three months after the last session, all registrations are deleted.
 * Before that, the name and email address of parents who gave marketing
 * consent are copied to the "Marketing Contacts" tab, where they stay until
 * the parent withdraws consent (then delete that row). The Log is emptied as
 * well. A daily trigger (installed by setup) does this automatically and
 * reminds the organisers by email REMINDER_DAYS before.
 */

var MARKETING_HEADERS = ['Parent First Name', 'Parent Last Name', 'Parent Email', 'Language', 'Consent Given', 'Source'];

function lastSessionId_() { return WORKSHOP.sessions[WORKSHOP.sessions.length - 1].id; }

function addDays_(iso, days, months) {
  var p = iso.split('-').map(Number);
  var d = new Date(Date.UTC(p[0], p[1] - 1 + (months || 0), p[2] + (days || 0)));
  return d.toISOString().slice(0, 10);
}
function retentionDate_() { return addDays_(lastSessionId_(), 0, SETTINGS.RETENTION_MONTHS); }
function reminderDate_() { return addDays_(retentionDate_(), -SETTINGS.REMINDER_DAYS); }
function today_() { return Utilities.formatDate(new Date(), 'Europe/Zurich', 'yyyy-MM-dd'); }

function installRetentionTrigger_() {
  var exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'retentionCheck'; });
  if (!exists) ScriptApp.newTrigger('retentionCheck').timeBased().everyDays(1).atHour(3).create();
}

// Daily (trigger): reminder, then deletion on the deletion date.
function retentionCheck() {
  var props = PropertiesService.getScriptProperties();
  var today = today_();
  if (today >= reminderDate_() && today < retentionDate_() && !props.getProperty('retentionReminderSent')) {
    MailApp.sendEmail({
      to: SETTINGS.ADMIN_EMAIL,
      subject: WORKSHOP.title.en + ': registration data will be deleted on ' + retentionDate_(),
      body: ['As stated in the Privacy Policy, the ' + WORKSHOP.title.en + ' registrations are deleted automatically on ' + retentionDate_() + ' (three months after the workshop).',
        '', 'If anything is needed for accounting (for example the payment overview), export it before then: File > Download.',
        'Names and email addresses of parents who gave marketing consent are kept in the "Marketing Contacts" tab.',
        '', SpreadsheetApp.getActiveSpreadsheet().getUrl()].join('\n'),
      name: 'QGZ Kids Chess registration'
    });
    props.setProperty('retentionReminderSent', today);
  }
  if (today >= retentionDate_() && !props.getProperty('retentionApplied')) applyRetention_();
}

function applyRetention_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = sheet_(), col = columnMap_(sheet), rows = dataRows_(sheet);

  // 1. keep marketing contacts (one per email address)
  var mk = ss.getSheetByName(SETTINGS.MARKETING_SHEET) || ss.insertSheet(SETTINGS.MARKETING_SHEET);
  if (mk.getLastRow() === 0) mk.appendRow(MARKETING_HEADERS);
  var known = {};
  if (mk.getLastRow() > 1) mk.getRange(2, 3, mk.getLastRow() - 1, 1).getValues().forEach(function (r) { known[String(r[0]).toLowerCase()] = true; });
  var kept = 0;
  rows.forEach(function (row) {
    if (!row[col['Registration ID'] - 1] || row[col['Marketing Consent'] - 1] !== 'Yes') return;
    var email = String(row[col['Parent Email'] - 1]).trim();
    if (known[email.toLowerCase()]) return;
    known[email.toLowerCase()] = true;
    mk.appendRow([safe_(row[col['Parent First Name'] - 1]), safe_(row[col['Parent Last Name'] - 1]), safe_(email),
      row[col['Language'] - 1], row[col['Registration Date'] - 1], WORKSHOP.title.en]);
    kept++;
  });

  // 2. delete all registrations (contents only; the tick boxes and formats stay)
  var deleted = rows.filter(function (r) { return r[col['Registration ID'] - 1]; }).length;
  if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();

  // 3. empty the Log, close registration
  var log = ss.getSheetByName(SETTINGS.LOG_SHEET);
  if (log && log.getLastRow() > 1) log.getRange(2, 1, log.getLastRow() - 1, 4).clearContent();
  var set = ss.getSheetByName(SETTINGS.SETTINGS_SHEET);
  if (set) set.getRange(1, 1, set.getLastRow(), 2).getValues().forEach(function (r, i) {
    if (r[0] === 'Registration open') set.getRange(i + 1, 2).setValue('No');
  });

  PropertiesService.getScriptProperties().setProperty('retentionApplied', today_());
  log_('retention', deleted + ' registration(s) deleted; ' + kept + ' marketing contact(s) kept', '');
  MailApp.sendEmail({
    to: SETTINGS.ADMIN_EMAIL,
    subject: WORKSHOP.title.en + ': registration data deleted',
    body: deleted + ' registration(s) were deleted on ' + today_() + ' as stated in the Privacy Policy. ' +
      kept + ' marketing contact(s) were kept in the "Marketing Contacts" tab (delete a row there when a parent withdraws consent).\n\n' +
      ss.getUrl(),
    name: 'QGZ Kids Chess registration'
  });
  return { deleted: deleted, kept: kept };
}

function showRetention() {
  var msg = 'Registrations are deleted automatically on ' + retentionDate_() + ' (reminder to the organisers on ' + reminderDate_() + '). ' +
    'Names and email addresses of parents with marketing consent are kept in "' + SETTINGS.MARKETING_SHEET + '".' +
    (PropertiesService.getScriptProperties().getProperty('retentionApplied') ? ' Already applied on ' + PropertiesService.getScriptProperties().getProperty('retentionApplied') + '.' : '');
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log(msg); }
}

function applyRetentionFromMenu() {
  if (today_() < retentionDate_()) {
    try { SpreadsheetApp.getUi().alert('Not yet: the deletion date is ' + retentionDate_() + '. To delete a single registration earlier (for example on request), delete its row.'); } catch (e) {}
    return;
  }
  var r = applyRetention_();
  try { SpreadsheetApp.getUi().alert(r.deleted + ' registration(s) deleted, ' + r.kept + ' marketing contact(s) kept.'); } catch (e) {}
}

/* ---------------------------------------------------------------------- */
/* Emails                                                                  */

var MAIL_TEXT = {
  en: {
    subject: 'Registration confirmed: {title}',
    hello: 'Hello {name}',
    intro: 'Thank you for registering {child} for {title}. This email confirms the booking.',
    child: 'Child', sessions: 'Sessions', location: 'Location', booking: 'Booking',
    count: { 1: '1 session', n: '{n} sessions' }, total: 'Total',
    reference: 'Reference',
    change: 'If you would like to change or cancel the booking, or if you have any questions, simply reply to this email or write to {email}.',
    bye: 'We look forward to seeing {child}!',
    home: 'https://queensgambitzurich.ch/en/'
  },
  de: {
    subject: 'Anmeldebestätigung: {title}',
    hello: 'Guten Tag {fullName}',
    intro: 'Vielen Dank, dass Sie {child} für {title} angemeldet haben. Mit dieser E-Mail bestätigen wir die Buchung.',
    child: 'Kind', sessions: 'Termine', location: 'Ort', booking: 'Buchung',
    count: { 1: '1 Termin', n: '{n} Termine' }, total: 'Total',
    reference: 'Referenz',
    change: 'Möchten Sie die Buchung ändern oder stornieren, oder haben Sie Fragen? Antworten Sie einfach auf diese E-Mail oder schreiben Sie an {email}.',
    bye: 'Wir freuen uns auf {child}!',
    home: 'https://queensgambitzurich.ch/'
  }
};

function fill_(s, vars) {
  return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars[k] == null ? m : vars[k]; });
}

function sendConfirmation_(r, conf) {
  var t = MAIL_TEXT[r.lang];
  var title = WORKSHOP.title[r.lang];
  var child = r.childFirst + ' ' + r.childLast;
  var vars = { title: title, name: r.parentFirst, fullName: r.parentFirst + ' ' + r.parentLast, child: r.childFirst, email: SETTINGS.REPLY_TO, n: r.sessions.length };
  var sessions = r.sessions.map(function (id) {
    var s = sessionById_(id);
    return { when: s[r.lang].date + ', ' + s.time, what: s[r.lang].label };
  });
  var count = fill_(r.sessions.length === 1 ? t.count[1] : t.count.n, vars);
  var showPrice = conf.publish && r.price != null;

  var text = [fill_(t.hello, vars), '', fill_(t.intro, vars), '',
    t.child + ': ' + child + ' (' + EXPERIENCE_LABELS[r.lang][r.experience] + ')', '',
    t.sessions + ':']
    .concat(sessions.map(function (s) { return '- ' + s.when + ' · ' + s.what; }))
    .concat(['', t.location + ': ' + WORKSHOP.location, t.booking + ': ' + count])
    .concat(showPrice ? [t.total + ': ' + money_(conf, r.price)] : [])
    .concat([t.reference + ': ' + r.id, '', fill_(t.change, vars), '', fill_(t.bye, vars),
      "Queen's Gambit Zürich", t.home]);

  var row = function (label, value) {
    return '<tr><td style="padding:6px 12px 6px 0;color:#4E5470;vertical-align:top;white-space:nowrap">' + esc_(label) +
      '</td><td style="padding:6px 0;color:#202334;vertical-align:top">' + value + '</td></tr>';
  };
  var sessionHtml = sessions.map(function (s) {
    return '<div style="margin:0 0 6px"><strong>' + esc_(s.when) + '</strong><br>' + esc_(s.what) + '</div>';
  }).join('');
  var html =
    '<div style="background:#EAF3FF;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#FFFFFF;border-radius:18px;overflow:hidden;border:1px solid #DCE3F5">' +
    '<div style="background:#0070B4;padding:20px 24px;color:#FFFFFF">' +
    '<div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.9">Queen\'s Gambit Zürich · Kids Chess</div>' +
    '<div style="font-size:22px;font-weight:bold;margin-top:6px">' + esc_(title) + '</div></div>' +
    '<div style="padding:24px;font-size:15px;line-height:1.55;color:#202334">' +
    '<p style="margin:0 0 12px">' + esc_(fill_(t.hello, vars)) + '</p>' +
    '<p style="margin:0 0 18px">' + esc_(fill_(t.intro, vars)) + '</p>' +
    '<div style="background:#FFF8D6;border:1px solid #FDE68A;border-radius:12px;padding:14px 16px;margin:0 0 18px">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:15px">' +
    row(t.child, '<strong>' + esc_(child) + '</strong> (' + esc_(EXPERIENCE_LABELS[r.lang][r.experience]) + ')') +
    row(t.sessions, sessionHtml) +
    row(t.location, esc_(WORKSHOP.location)) +
    row(t.booking, esc_(count)) +
    (showPrice ? row(t.total, '<strong>' + esc_(money_(conf, r.price)) + '</strong>') : '') +
    row(t.reference, esc_(r.id)) +
    '</table></div>' +
    '<p style="margin:0 0 12px">' + esc_(fill_(t.change, vars)) + '</p>' +
    '<p style="margin:0">' + esc_(fill_(t.bye, vars)) + '</p>' +
    '<p style="margin:16px 0 0;color:#4E5470">Queen\'s Gambit Zürich<br>' +
    '<a href="' + t.home + '" style="color:#0070B4">queensgambitzurich.ch</a></p>' +
    '</div></div></div>';

  MailApp.sendEmail({
    to: r.email,
    subject: fill_(t.subject, vars),
    body: text.join('\n'),
    htmlBody: html,
    name: SETTINGS.SENDER_NAME,
    replyTo: SETTINGS.REPLY_TO
  });
}

function sendAdminNotice_(r, timestamp, conf) {
  var when = Utilities.formatDate(timestamp, 'Europe/Zurich', 'yyyy-MM-dd HH:mm:ss');
  var lines = [
    'New registration for ' + WORKSHOP.title.en,
    '',
    'Child: ' + r.childFirst + ' ' + r.childLast + ', age ' + r.age + ', ' + EXPERIENCE[r.experience],
    'Parent: ' + r.parentFirst + ' ' + r.parentLast,
    'Email: ' + r.email,
    'Phone: ' + r.phone,
    '',
    'Sessions (' + r.sessions.length + '):'
  ].concat(r.sessions.map(function (id) { var s = sessionById_(id); return '- ' + s.en.date + ', ' + s.time + ' · ' + s.en.label; }))
   .concat([
    'Price: ' + (r.price == null ? 'not configured yet' : money_(conf, r.price)),
    'Marketing consent: ' + (r.marketing ? 'Yes' : 'No'),
    'Language: ' + r.lang.toUpperCase(),
    'Reference: ' + r.id,
    'Registered: ' + when + ' (Zürich time)',
    '',
    'Dashboard and all registrations: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ]);
  MailApp.sendEmail({
    to: SETTINGS.ADMIN_EMAIL,
    subject: WORKSHOP.title.en + ' registration: ' + r.childFirst + ' ' + r.childLast + ' (' + r.sessions.length + ' session' + (r.sessions.length === 1 ? '' : 's') + ')',
    body: lines.join('\n'),
    name: 'QGZ Kids Chess registration'
  });
}

/* ---------------------------------------------------------------------- */
/* Setup, dashboard and menu                                               */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Kids Chess')
    .addItem('Fill in missing prices', 'fillMissingPrices')
    .addItem('Send test emails to me', 'testEmails')
    .addItem('Data retention: show deletion date', 'showRetention')
    .addItem('Data retention: apply now (only on or after the deletion date)', 'applyRetentionFromMenu')
    .addSeparator()
    .addItem('Repair sheets (setup)', 'setup')
    .addToUi();
}

/**
 * Run once from the Apps Script editor (Run ▸ setup). Creates the
 * Registrations, Settings, Dashboard and Log tabs. Safe to run again:
 * registrations and settings you entered are kept.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Europe/Zurich');
  var H = headers_();

  // --- Registrations ---
  var sheet = ss.getSheetByName(SETTINGS.SHEET_NAME) || ss.insertSheet(SETTINGS.SHEET_NAME, 0);
  if (sheet.getMaxColumns() < H.length) sheet.insertColumnsAfter(sheet.getMaxColumns(), H.length - sheet.getMaxColumns());
  sheet.getRange(1, 1, 1, H.length).setValues([H]).setFontWeight('bold').setBackground('#E4E9FF').setWrap(true);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(1);
  var c = function (name) { return H.indexOf(name) + 1; };
  var rows = sheet.getMaxRows() - 1;
  sheet.getRange(2, c('Registration Date'), rows, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sheet.getRange(2, c('Price'), rows, 1).setNumberFormat('#,##0.00');
  // Checkbox validation without values, so empty rows stay empty (appendRow
  // writes after the last row that has content).
  var tick = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  WORKSHOP.sessions.forEach(function (s) { sheet.getRange(2, c(s.column), rows, 1).setDataValidation(tick); });
  sheet.getRange(2, c('Registration Status'), rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList([STATUS.confirmed, STATUS.cancelled], true).build());
  sheet.getRange(2, c('Payment Status'), rows, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(PAYMENT, true).build());
  sheet.setColumnWidths(1, H.length, 130);
  sheet.setColumnWidth(c('Parent Email'), 210);
  sheet.setColumnWidth(c('Notes'), 240);
  if (!sheet.getFilter()) sheet.getRange(1, 1, sheet.getMaxRows(), H.length).createFilter();

  // --- Settings (values entered earlier are kept) ---
  var set = ss.getSheetByName(SETTINGS.SETTINGS_SHEET) || ss.insertSheet(SETTINGS.SETTINGS_SHEET, 1);
  var keep = {};
  if (set.getLastRow() > 0) {
    set.getRange(1, 1, set.getLastRow(), 4).getValues().forEach(function (r) { keep[String(r[0])] = r; });
  }
  var get = function (key, i, dflt) { return keep[key] && keep[key][i] !== '' ? keep[key][i] : dflt; };
  var layout = [
    [WORKSHOP.title.en + ' · Settings', '', '', ''],
    ['Change the values in the white cells. Leave a price empty while it is not decided: nothing is shown to parents until "Publish prices" is Yes.', '', '', ''],
    ['', '', '', ''],
    ['Session ID', 'Session', 'Capacity (children)', 'Price per session']
  ];
  WORKSHOP.sessions.forEach(function (s) {
    layout.push(["'" + s.id, s.column + ' · ' + s.time + ' · ' + s.en.label, get(s.id, 2, SETTINGS.DEFAULT_CAPACITY), get(s.id, 3, '')]);
  });
  layout.push(['', '', '', '']);
  layout.push(['Setting', 'Value', '', '']);
  for (var n = 2; n <= WORKSHOP.sessions.length; n++) {
    var k = 'Package price, ' + n + ' sessions';
    layout.push([k, get(k, 1, ''), 'Optional. Replaces the sum of the session prices for ' + n + ' sessions.', '']);
  }
  layout.push(['Currency', get('Currency', 1, 'CHF'), '', '']);
  layout.push(['Publish prices', get('Publish prices', 1, 'No'), 'Yes = show prices on the website and in confirmation emails.', '']);
  layout.push(['Registration open', get('Registration open', 1, 'Yes'), 'No = the website form stops accepting registrations.', '']);
  set.clear();
  set.getRange(1, 1, layout.length, 4).setValues(layout);
  set.getRange('A1').setFontWeight('bold').setFontSize(13);
  set.getRange('A2').setFontColor('#4E5470').setFontStyle('italic');
  set.getRange(4, 1, 1, 4).setFontWeight('bold').setBackground('#E4E9FF');
  var first = 5, last = first + WORKSHOP.sessions.length - 1;
  set.getRange(first, 3, WORKSHOP.sessions.length, 2).setBackground('#FFFFFF').setBorder(true, true, true, true, true, true, '#C9D3EE', SpreadsheetApp.BorderStyle.SOLID);
  set.getRange(first, 4, WORKSHOP.sessions.length, 1).setNumberFormat('#,##0.00');
  set.getRange(first, 1, WORKSHOP.sessions.length, 2).setFontColor('#4E5470');
  var sRow = last + 2;
  set.getRange(sRow, 1, 1, 2).setFontWeight('bold').setBackground('#E4E9FF');
  var valueRows = layout.length - sRow;
  set.getRange(sRow + 1, 2, valueRows, 1).setBackground('#FFFFFF').setBorder(true, true, true, true, true, true, '#C9D3EE', SpreadsheetApp.BorderStyle.SOLID);
  set.getRange(sRow + 1, 3, valueRows, 1).setFontColor('#4E5470');
  var yesNo = SpreadsheetApp.newDataValidation().requireValueInList(['Yes', 'No'], true).build();
  set.getRange(layout.length - 1, 2, 2, 1).setDataValidation(yesNo);
  set.getRange(sRow + 1, 2, WORKSHOP.sessions.length - 1, 1).setNumberFormat('#,##0.00');
  set.setColumnWidth(1, 230); set.setColumnWidth(2, 260); set.setColumnWidth(3, 150); set.setColumnWidth(4, 150);
  set.setFrozenRows(0);

  buildDashboard_(ss, H, first);

  var mk = ss.getSheetByName(SETTINGS.MARKETING_SHEET) || ss.insertSheet(SETTINGS.MARKETING_SHEET);
  if (mk.getLastRow() === 0) {
    mk.appendRow(MARKETING_HEADERS);
    mk.getRange(1, 1, 1, MARKETING_HEADERS.length).setFontWeight('bold').setBackground('#E4E9FF');
    mk.setFrozenRows(1);
    mk.setColumnWidths(1, MARKETING_HEADERS.length, 170);
  }
  set.getRange(layout.length + 2, 1, 2, 3).setValues([
    ['Data deletion date', "'" + retentionDate_(), 'Registrations are deleted automatically on this date (Privacy Policy). Marketing contacts are kept.'],
    ['Reminder to organisers', "'" + reminderDate_(), 'Email to the organisers, so that anything needed for accounting can be exported first.']
  ]);
  set.getRange(layout.length + 2, 1, 2, 3).setFontColor('#4E5470');
  installRetentionTrigger_();

  var log = ss.getSheetByName(SETTINGS.LOG_SHEET) || ss.insertSheet(SETTINGS.LOG_SHEET);
  if (log.getLastRow() === 0) log.appendRow(['Time', 'Type', 'Detail', 'Email (masked)']);
  log.setFrozenRows(1);
}

function colLetter_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

function buildDashboard_(ss, H, firstSessionRow) {
  var d = ss.getSheetByName(SETTINGS.DASHBOARD_SHEET) || ss.insertSheet(SETTINGS.DASHBOARD_SHEET, 0);
  d.clear();
  var R = "'" + SETTINGS.SHEET_NAME + "'!";
  var S = "'" + SETTINGS.SETTINGS_SHEET + "'!";
  var col = function (name) { var l = colLetter_(H.indexOf(name) + 1); return R + l + '2:' + l; };
  var status = col('Registration Status'), price = col('Price'), pay = col('Payment Status'), id = col('Registration ID');
  var active = '(' + id + '<>"")*(' + status + '<>"' + STATUS.cancelled + '")';

  var rows = [
    [WORKSHOP.title.en + ' · Dashboard', '', '', ''],
    ['Updates automatically from the Registrations tab. Cancelled registrations are not counted.', '', '', ''],
    ['', '', '', ''],
    ['Overview', '', '', ''],
    ['Registrations (children)', '=SUMPRODUCT(' + active + ')', '', ''],
    ['Cancelled', '=COUNTIF(' + status + ',"' + STATUS.cancelled + '")', '', ''],
    ['Bookings for ' + WORKSHOP.sessions.map(function (s, i) { return i + 1; }).join(' / ') + ' sessions',
      '=' + WORKSHOP.sessions.map(function (s, i) { return 'SUMPRODUCT(' + active + '*(' + col('Sessions') + '=' + (i + 1) + '))'; }).join('&" / "&'), '', ''],
    ['Marketing consent given', '=SUMPRODUCT(' + active + '*(' + col('Marketing Consent') + '="Yes"))', '', ''],
    ['', '', '', ''],
    ['Session', 'Children registered', 'Capacity', 'Places left']
  ];
  WORKSHOP.sessions.forEach(function (s, i) {
    var r = rows.length + 1;
    var capCell = S + 'C' + (firstSessionRow + i);
    rows.push([s.column + ' · ' + s.time + ' · ' + s.en.label,
      '=SUMPRODUCT(' + active + '*(' + col(s.column) + '=TRUE))', '=' + capCell, '=MAX(0,C' + r + '-B' + r + ')']);
  });
  var sessionEnd = rows.length;
  rows.push(['', '', '', '']);
  rows.push(['Revenue and payments', 'Registrations', 'Amount', '']);
  var r0 = rows.length + 1;
  rows.push(['Expected revenue (all active registrations)', '=SUMPRODUCT(' + active + ')', '=SUMPRODUCT(' + active + '*IFERROR(1*' + price + ',0))', '']);
  rows.push(['Paid', '=SUMPRODUCT(' + active + '*(' + pay + '="Paid"))', '=SUMPRODUCT(' + active + '*(' + pay + '="Paid")*IFERROR(1*' + price + ',0))', '']);
  rows.push(['Open (not yet paid)', '=SUMPRODUCT(' + active + '*(' + pay + '="Open"))', '=SUMPRODUCT(' + active + '*(' + pay + '="Open")*IFERROR(1*' + price + ',0))', '']);
  rows.push(['Refunded', '=COUNTIF(' + pay + ',"Refunded")', '=SUMIF(' + pay + ',"Refunded",' + price + ')', '']);
  rows.push(['Registrations without a price', '=SUMPRODUCT(' + active + '*(' + price + '=""))', 'Use Kids Chess ▸ Fill in missing prices once prices are set.', '']);
  d.getRange(1, 1, rows.length, 4).setValues(rows);

  d.getRange('A1').setFontWeight('bold').setFontSize(14).setFontColor('#0070B4');
  d.getRange('A2').setFontColor('#4E5470').setFontStyle('italic');
  [4, 10, r0 - 1].forEach(function (r) { d.getRange(r, 1, 1, 4).setFontWeight('bold').setBackground('#E4E9FF'); });
  d.getRange(11, 2, sessionEnd - 10, 3).setHorizontalAlignment('center');
  d.getRange(11, 4, sessionEnd - 10, 1).setFontWeight('bold').setBackground('#FFF8D6');
  d.getRange(r0, 3, 4, 1).setNumberFormat('#,##0.00');
  d.getRange(r0 + 4, 3).setFontColor('#4E5470').setFontStyle('italic');
  // Places left: red when a session is full
  var full = SpreadsheetApp.newConditionalFormatRule().whenNumberEqualTo(0).setBackground('#F9D8D6').setFontColor('#8C1D18')
    .setRanges([d.getRange(11, 4, sessionEnd - 10, 1)]).build();
  d.setConditionalFormatRules([full]);
  d.setColumnWidth(1, 320); d.setColumnWidths(2, 3, 150);
}

/**
 * Menu ▸ Fill in missing prices: once prices are entered in Settings, writes
 * the applicable price into active registrations that do not have one yet.
 * Existing prices are never changed.
 */
function fillMissingPrices() {
  var conf = readSettings_();
  var sheet = sheet_(), col = columnMap_(sheet), rows = dataRows_(sheet), filled = 0, missing = 0;
  rows.forEach(function (row, i) {
    if (!row[col['Registration ID'] - 1] || !isActive_(row, col) || row[col['Price'] - 1] !== '') return;
    var ids = WORKSHOP.sessions.filter(function (s) { return isTicked_(row[col[s.column] - 1]); }).map(function (s) { return s.id; });
    var p = ids.length ? priceFor_(conf, ids) : null;
    if (p == null) { missing++; return; }
    sheet.getRange(i + 2, col['Price']).setValue(p);
    filled++;
  });
  var msg = filled + ' price(s) filled in.' + (missing ? ' ' + missing + ' registration(s) still have no price: check the Settings tab.' : '');
  try { SpreadsheetApp.getUi().alert(msg); } catch (e) { console.log(msg); }
}

/**
 * Menu ▸ Send test emails to me: sends yourself the parent confirmation in
 * English and German (all three sessions) without touching the Registrations
 * tab and without notifying the organisers.
 */
function testEmails() {
  var me = Session.getActiveUser().getEmail();
  var conf = readSettings_();
  var ids = WORKSHOP.sessions.map(function (s) { return s.id; });
  ['en', 'de'].forEach(function (lang) {
    sendConfirmation_({ id: 'KC-TEST', parentFirst: 'Test', parentLast: 'Parent', email: me, phone: '+41 00 000 00 00',
      childFirst: 'Test', childLast: 'Child', age: 8, experience: 'beginner', sessions: ids,
      price: priceFor_(conf, ids), marketing: false, lang: lang }, conf);
  });
}
