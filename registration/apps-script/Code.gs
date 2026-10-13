/**
 * Queen's Gambit Zürich · event registration (Google Apps Script)
 * ------------------------------------------------------------------------
 * Receives registrations from the website form, stores them in this Google
 * Sheet and then sends the confirmation emails.
 *
 * Order of operations (so a visitor never sees a false confirmation):
 *   1. validate input and spam checks
 *   2. lock, check for duplicates (same email, case-insensitive), append row
 *   3. read the row back to confirm it was stored
 *   4. only then send the participant confirmation and the admin notification
 *   5. answer { ok: true, stored: true }; any failure before step 3 answers
 *      { ok: false, code } and sends no email.
 *
 * The web app only ACCEPTS registrations. It never returns stored data, so
 * the public URL cannot be used to read the participant list.
 * Setup instructions: registration/README.md
 */

var SETTINGS = {
  SHEET_NAME: 'Registrations',
  SUMMARY_SHEET: 'Summary',
  LOG_SHEET: 'Log',
  ADMIN_EMAIL: 'info@queensgambitzurich.ch',
  REPLY_TO: 'info@queensgambitzurich.ch',
  SENDER_NAME: "Queen's Gambit Zürich",
  MIN_FILL_MS: 3000,          // faster submissions are treated as bots
  MAX_PER_HOUR: 60,           // overall limit across all visitors
  MAX_PER_EMAIL_HOUR: 5       // repeated attempts with the same email address
};

// Events that accept registrations. The key is the event id from data/events.js.
var EVENTS = {
  'chess-club-2026-11-29': {
    open: true,
    en: {
      title: "QGZ × WINZ | Beyond the Chessboard",
      date: 'Sunday, 29 November 2026',
      time: 'from 13:00',
      location: "ROBIN’S, Stampfenbachstrasse 38, 8006 Zürich"
    },
    de: {
      title: "QGZ × WINZ | Beyond the Chessboard",
      date: 'Sonntag, 29. November 2026',
      time: 'ab 13:00 Uhr',
      location: "ROBIN’S, Stampfenbachstrasse 38, 8006 Zürich"
    }
  }
};

var HEADERS = ['Registration Date', 'Full Name', 'Email Address', 'Participation Type', 'Elo Rating', 'Language', 'Registration Status'];
var TYPES = { general: 'General', blitz: 'Blitz', both: 'Both' };
var TYPE_LABELS = {
  en: { general: 'General attendance', blitz: 'Blitz tournament', both: 'General attendance and blitz tournament' },
  de: { general: 'Allgemeine Teilnahme', blitz: 'Blitzturnier', both: 'Allgemeine Teilnahme und Blitzturnier' }
};

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
    if (check.code !== 'spam') log_('rejected', check.code, input && input.email);
    return reply_({ ok: false, code: check.code === 'spam' ? 'invalid' : check.code });
  }
  var r = check.value;

  if (!rateLimit_(r.email)) {
    log_('rejected', 'rate', r.email);
    return reply_({ ok: false, code: 'rate' });
  }

  // --- store (under a lock, so two submissions cannot race) ---
  var lock = LockService.getScriptLock();
  var stored = false;
  var timestamp = new Date();
  try {
    lock.waitLock(20000);
    var sheet = sheet_();
    if (isDuplicate_(sheet, r.email)) {
      log_('rejected', 'duplicate', r.email);
      return reply_({ ok: false, code: 'duplicate' });
    }
    sheet.appendRow([
      timestamp, safe_(r.name), safe_(r.email), TYPES[r.type],
      r.elo === '' ? '' : Number(r.elo), r.lang.toUpperCase(), 'Confirmed'
    ]);
    SpreadsheetApp.flush();
    var last = sheet.getLastRow();
    stored = String(sheet.getRange(last, 3).getValue()).toLowerCase() === safe_(r.email).toLowerCase();
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

  // --- emails: only after the registration is stored ---
  var mailOk = true;
  try {
    sendConfirmation_(r);
  } catch (err) {
    mailOk = false;
    log_('error', 'confirmation email: ' + err, r.email);
  }
  try {
    sendAdminNotice_(r, timestamp);
  } catch (err) {
    log_('error', 'admin email: ' + err, r.email);
  }
  log_('registered', TYPES[r.type] + (mailOk ? '' : ' (confirmation email failed)'), r.email);
  return reply_({ ok: true, stored: true, emailSent: mailOk });
}

// Health check only. Never returns registrations.
function doGet() {
  return reply_({ ok: true, service: 'qgz-registration' });
}

/* ---------------------------------------------------------------------- */

function validate_(x) {
  if (!x || typeof x !== 'object') return { ok: false, code: 'invalid' };
  if (x.website) return { ok: false, code: 'spam' };                                   // honeypot
  if (!(Number(x.elapsedMs) >= SETTINGS.MIN_FILL_MS)) return { ok: false, code: 'spam' }; // too fast
  var ev = EVENTS[x.eventId];
  if (!ev || !ev.open) return { ok: false, code: 'closed' };
  if (x.consent !== true) return { ok: false, code: 'invalid' };

  var name = String(x.name || '').replace(/\s+/g, ' ').trim();
  var email = String(x.email || '').trim();
  var type = String(x.type || '');
  var elo = String(x.elo == null ? '' : x.elo).trim();
  var lang = x.lang === 'de' ? 'de' : 'en';

  if (name.length < 2 || name.length > 100) return { ok: false, code: 'invalid' };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, code: 'invalid' };
  if (!TYPES[type]) return { ok: false, code: 'invalid' };
  if (elo !== '' && !(/^\d{1,4}$/.test(elo) && +elo >= 100 && +elo <= 3500)) return { ok: false, code: 'invalid' };

  return { ok: true, value: { eventId: x.eventId, name: name, email: email, type: type, elo: elo, lang: lang } };
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

function isDuplicate_(sheet, email) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var target = safe_(email).toLowerCase();
  var values = sheet.getRange(2, 3, last - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).toLowerCase() === target) return true;
  }
  return false;
}

// Prevent spreadsheet formula injection ("=", "+", "-", "@" at the start).
function safe_(v) {
  v = String(v);
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SETTINGS.SHEET_NAME);
  if (!sheet) { setup(); sheet = ss.getSheetByName(SETTINGS.SHEET_NAME); }
  return sheet;
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

/* ---------------------------------------------------------------------- */

function sendConfirmation_(r) {
  var ev = EVENTS[r.eventId][r.lang];
  var de = r.lang === 'de';
  var type = TYPE_LABELS[r.lang][r.type];
  var subject = de ? 'Anmeldebestätigung: ' + ev.title : 'Registration confirmed: ' + ev.title;
  var lines = de ? [
    'Hallo ' + r.name,
    '',
    'Vielen Dank für deine Anmeldung. Hiermit bestätigen wir deine Teilnahme:',
    '',
    ev.title,
    'Datum: ' + ev.date,
    'Zeit: ' + ev.time,
    'Ort: ' + ev.location,
    'Art der Teilnahme: ' + type,
    '',
    'Die Teilnahme ist kostenlos.',
    '',
    'Falls du nicht teilnehmen kannst oder deine Anmeldung ändern möchtest, antworte einfach auf diese E-Mail oder schreib an ' + SETTINGS.REPLY_TO + '.',
    '',
    'Wir freuen uns auf dich!',
    "Queen's Gambit Zürich",
    'https://queensgambitzurich.ch/de/'
  ] : [
    'Hello ' + r.name,
    '',
    'Thank you for registering. This email confirms your place:',
    '',
    ev.title,
    'Date: ' + ev.date,
    'Time: ' + ev.time,
    'Location: ' + ev.location,
    'Participation type: ' + type,
    '',
    'Participation is free of charge.',
    '',
    'If you cannot attend or would like to change your registration, simply reply to this email or write to ' + SETTINGS.REPLY_TO + '.',
    '',
    'We look forward to seeing you!',
    "Queen's Gambit Zürich",
    'https://queensgambitzurich.ch/'
  ];
  MailApp.sendEmail({
    to: r.email,
    subject: subject,
    body: lines.join('\n'),
    htmlBody: toHtml_(lines),
    name: SETTINGS.SENDER_NAME,
    replyTo: SETTINGS.REPLY_TO
  });
}

function sendAdminNotice_(r, timestamp) {
  var ev = EVENTS[r.eventId].en;
  var when = Utilities.formatDate(timestamp, 'Europe/Zurich', 'yyyy-MM-dd HH:mm:ss');
  var lines = [
    'New registration for ' + ev.title,
    '',
    'Name: ' + r.name,
    'Email: ' + r.email,
    'Participation type: ' + TYPES[r.type],
    'Elo rating: ' + (r.elo || 'not provided'),
    'Language: ' + r.lang.toUpperCase(),
    'Registered: ' + when + ' (Zürich time)',
    '',
    'All registrations: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
  ];
  MailApp.sendEmail({
    to: SETTINGS.ADMIN_EMAIL,
    subject: 'New registration: ' + r.name + ' (' + TYPES[r.type] + ')',
    body: lines.join('\n'),
    name: 'QGZ registration'
  });
}

function toHtml_(lines) {
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); };
  return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#202334">' +
    lines.map(function (l) { return l === '' ? '<br>' : '<div>' + esc(l) + '</div>'; }).join('') + '</div>';
}

/* ---------------------------------------------------------------------- */

/**
 * Run once from the Apps Script editor (Run ▸ setup). Creates the
 * Registrations, Summary and Log sheets with headers, formats and a filter.
 * Safe to run again: existing data is kept.
 */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Europe/Zurich');

  var sheet = ss.getSheetByName(SETTINGS.SHEET_NAME) || ss.insertSheet(SETTINGS.SHEET_NAME, 0);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#E4E9FF');
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange('E:E').setNumberFormat('0');
  sheet.setColumnWidths(1, HEADERS.length, 170);
  if (!sheet.getFilter()) sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 2), HEADERS.length).createFilter();

  var sum = ss.getSheetByName(SETTINGS.SUMMARY_SHEET) || ss.insertSheet(SETTINGS.SUMMARY_SHEET, 1);
  var R = "'" + SETTINGS.SHEET_NAME + "'";
  sum.getRange('A1:B6').setValues([
    ['Overview', ''],
    ['Total registrations', '=COUNTA(' + R + '!C2:C)'],
    ['General only', '=COUNTIF(' + R + '!D2:D,"General")'],
    ['Blitz only', '=COUNTIF(' + R + '!D2:D,"Blitz")'],
    ['Both', '=COUNTIF(' + R + '!D2:D,"Both")'],
    ['Blitz tournament players (Blitz + Both)', '=COUNTIF(' + R + '!D2:D,"Blitz")+COUNTIF(' + R + '!D2:D,"Both")']
  ]);
  sum.getRange('A1').setFontWeight('bold');
  sum.getRange('D2').setFormula('=IFERROR(SORT(FILTER({' + R + '!B2:B,' + R + '!E2:E},(' + R + '!D2:D="Blitz")+(' + R + '!D2:D="Both"))),"")');
  sum.getRange('D1:E1').setValues([['Blitz tournament players', 'Elo']]).setFontWeight('bold');
  sum.setColumnWidth(1, 300);
  sum.setColumnWidth(4, 220);

  var log = ss.getSheetByName(SETTINGS.LOG_SHEET) || ss.insertSheet(SETTINGS.LOG_SHEET);
  if (log.getLastRow() === 0) log.appendRow(['Time', 'Type', 'Detail', 'Email (masked)']);
  log.setFrozenRows(1);
}

/**
 * Optional: run from the editor to send yourself a test confirmation (EN and DE)
 * without touching the Registrations sheet.
 */
function testEmails() {
  var me = Session.getActiveUser().getEmail();
  ['en', 'de'].forEach(function (lang) {
    sendConfirmation_({ eventId: 'chess-club-2026-11-29', name: 'Test Person', email: me, type: 'both', elo: '1500', lang: lang });
  });
}
