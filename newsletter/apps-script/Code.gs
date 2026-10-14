/**
 * Queen's Gambit Zürich · newsletter signup (Google Apps Script)
 * ------------------------------------------------------------------------
 * Receives signups from the website's newsletter form and passes them to the
 * Mailchimp Marketing API. A separate project from the event registration
 * script; it stores nothing itself (no Sheet, no log of email addresses).
 *
 * Rules (so no existing contact is ever changed):
 *   - New address        → created with status "pending". Mailchimp then sends
 *                          its confirmation email (double opt-in); the address
 *                          is subscribed only after the link is clicked.
 *   - Already subscribed → answered "already"; nothing is changed.
 *   - Pending            → answered "pending"; nothing is changed.
 *   - Unsubscribed, cleaned, archived or any other status
 *                        → answered "existing"; nothing is changed (the visitor
 *                          is asked to email us).
 *   Contacts are looked up by Mailchimp's subscriber hash (MD5 of the lower-case
 *   address), so the same address can never be added twice.
 *
 * Settings live in Script properties (Project settings → Script properties):
 *   MC_API_KEY  Mailchimp API key, e.g. abc123…-us12 (required, never in GitHub)
 *   MC_LIST_ID  Audience ID (default 309936e8c9)
 * Setup instructions: newsletter/README.md
 */

var SETTINGS = {
  LIST_ID: '309936e8c9',
  TOPICS_CATEGORY: 'Newsletter topics',
  // Website topic keys → option names of the Mailchimp group "Newsletter topics"
  TOPICS: {
    community: "Women's Chess Club & Community",
    kids: 'Kids Chess',
    news: 'General QGZ News & Events'
  },
  LANG_FIELD: 'LANG',          // audience field "Language", if it exists
  MIN_FILL_MS: 2000,           // faster submissions are treated as bots
  MAX_PER_HOUR: 60,            // overall limit across all visitors
  MAX_PER_EMAIL_HOUR: 5        // repeated attempts with the same address
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
  if (!check.ok) return reply_({ ok: false, code: check.code });
  var r = check.value;

  if (r.spam) return reply_({ ok: true, code: 'success' });       // bots: pretend success
  if (!rateLimit_(r.email)) return reply_({ ok: false, code: 'rate' });

  try {
    return reply_(subscribe_(r));
  } catch (err) {
    console.error('newsletter: ' + (err && err.message));          // no email address in the log
    return reply_({ ok: false, code: 'server' });
  }
}

function doGet() {
  // The URL only accepts signups; it never returns audience data.
  return reply_({ ok: true, service: 'qgz-newsletter' });
}

/* ---------------------------------------------------------------------- */

function validate_(input) {
  if (!input || typeof input !== 'object') return { ok: false, code: 'invalid' };
  var email = String(input.email || '').trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, code: 'email' };
  if (input.consent !== true) return { ok: false, code: 'consent' };

  var topics = (Array.isArray(input.topics) ? input.topics : []).filter(function (t) {
    return Object.prototype.hasOwnProperty.call(SETTINGS.TOPICS, t);
  });
  if (!topics.length) return { ok: false, code: 'topics' };

  var spam = !!String(input.website || '') || Number(input.elapsedMs || 0) < SETTINGS.MIN_FILL_MS;
  return { ok: true, value: { email: email, topics: topics, lang: input.lang === 'en' ? 'en' : 'de', spam: spam } };
}

function rateLimit_(email) {
  var cache = CacheService.getScriptCache();
  var hour = Utilities.formatDate(new Date(), 'UTC', 'yyyyMMddHH');
  var keys = ['nl-all-' + hour, 'nl-' + hash_(email) + '-' + hour];
  var limits = [SETTINGS.MAX_PER_HOUR, SETTINGS.MAX_PER_EMAIL_HOUR];
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    for (var i = 0; i < keys.length; i++) {
      var n = Number(cache.get(keys[i]) || 0);
      if (n >= limits[i]) return false;
    }
    keys.forEach(function (k) { cache.put(k, String(Number(cache.get(k) || 0) + 1), 3600); });
    return true;
  } finally {
    lock.releaseLock();
  }
}

/* ---------------------------------------------------------------------- */

function subscribe_(r) {
  var listId = prop_('MC_LIST_ID') || SETTINGS.LIST_ID;
  var path = '/lists/' + listId + '/members/' + hash_(r.email);

  // 1. Look the address up first: existing contacts are never modified.
  var found = api_('get', path + '?fields=status');
  if (found.code === 200) {
    var status = found.body.status;
    if (status === 'subscribed') return { ok: false, code: 'already' };
    if (status === 'pending') return { ok: false, code: 'pending' };
    return { ok: false, code: 'existing' };
  }
  if (found.code !== 404) throw new Error('lookup HTTP ' + found.code);

  // 2. New address: create it as "pending" → Mailchimp sends the confirmation email.
  var meta = listMeta_(listId);
  var interests = {};
  r.topics.forEach(function (t) { interests[meta.interests[t]] = true; });
  var member = {
    email_address: r.email,
    status: 'pending',
    interests: interests,
    language: r.lang
  };
  if (meta.hasLang) {
    member.merge_fields = {};
    member.merge_fields[SETTINGS.LANG_FIELD] = r.lang;
  }

  var res = api_('post', '/lists/' + listId + '/members', member);
  if (res.code === 200) return { ok: true, code: 'success' };
  // Created by a parallel request a moment ago: treat as pending, change nothing.
  if (res.code === 400 && /exists/i.test(String(res.body && res.body.title))) return { ok: false, code: 'pending' };
  if (res.code === 400 && /invalid|fake/i.test(String(res.body && res.body.title))) return { ok: false, code: 'email' };
  throw new Error('create HTTP ' + res.code + ' ' + (res.body && res.body.title));
}

/** Interest IDs of the topic options and whether the LANG field exists (cached 6 h). */
function listMeta_(listId) {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('nl-meta-' + listId);
  if (cached) return JSON.parse(cached);

  var cats = api_('get', '/lists/' + listId + '/interest-categories?count=100&fields=categories.id,categories.title');
  var cat = (cats.body.categories || []).filter(function (c) { return c.title === SETTINGS.TOPICS_CATEGORY; })[0];
  if (!cat) throw new Error('interest category not found');
  var opts = api_('get', '/lists/' + listId + '/interest-categories/' + cat.id + '/interests?count=100&fields=interests.id,interests.name');
  var byName = {};
  (opts.body.interests || []).forEach(function (i) { byName[i.name] = i.id; });

  var interests = {};
  Object.keys(SETTINGS.TOPICS).forEach(function (key) {
    var id = byName[SETTINGS.TOPICS[key]];
    if (!id) throw new Error('interest not found: ' + key);
    interests[key] = id;
  });

  var fields = api_('get', '/lists/' + listId + '/merge-fields?count=100&fields=merge_fields.tag');
  var hasLang = (fields.body.merge_fields || []).some(function (f) { return f.tag === SETTINGS.LANG_FIELD; });

  var meta = { interests: interests, hasLang: hasLang };
  cache.put('nl-meta-' + listId, JSON.stringify(meta), 21600);
  return meta;
}

/* ---------------------------------------------------------------------- */

function api_(method, path, payload) {
  var key = prop_('MC_API_KEY');
  if (!key || key.indexOf('-') < 0) throw new Error('MC_API_KEY missing');
  var dc = key.split('-').pop();
  var opts = {
    method: method,
    muteHttpExceptions: true,
    headers: { Authorization: 'Basic ' + Utilities.base64Encode('qgz:' + key) }
  };
  if (payload) { opts.contentType = 'application/json'; opts.payload = JSON.stringify(payload); }
  var res = UrlFetchApp.fetch('https://' + dc + '.api.mailchimp.com/3.0' + path, opts);
  var body = {};
  try { body = JSON.parse(res.getContentText() || '{}'); } catch (err) { /* keep empty */ }
  return { code: res.getResponseCode(), body: body };
}

function hash_(email) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email.toLowerCase(), Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function prop_(name) {
  return PropertiesService.getScriptProperties().getProperty(name);
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------------- */

/** Run once from the editor after setting MC_API_KEY: checks the key, audience,
 *  topics and LANG field without creating or changing any contact. */
function checkSetup() {
  CacheService.getScriptCache().remove('nl-meta-' + (prop_('MC_LIST_ID') || SETTINGS.LIST_ID));
  var listId = prop_('MC_LIST_ID') || SETTINGS.LIST_ID;
  var list = api_('get', '/lists/' + listId + '?fields=name,double_optin');
  if (list.code !== 200) throw new Error('Audience not reachable (HTTP ' + list.code + '). Check MC_API_KEY.');
  var meta = listMeta_(listId);
  console.log('Audience: ' + list.body.name + ' · double opt-in in hosted forms: ' + list.body.double_optin);
  console.log('Topic IDs: ' + JSON.stringify(meta.interests));
  console.log('LANG field present: ' + meta.hasLang + ' (contact language is set either way)');
  console.log('OK: setup looks good.');
}
