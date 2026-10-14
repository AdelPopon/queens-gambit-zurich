/*
 * In-memory imitation of the Google services used by
 * registration/kids-chess/apps-script/Code.gs (SpreadsheetApp, MailApp,
 * LockService, CacheService …), so the real script can run in Node for the
 * offline tests (run-tests.js) and the local preview server (serve.js).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

function makeEnv() {
  const sheets = {};
  const mails = [];
  const noop = () => chain;
  const chain = new Proxy({}, { get: (t, k) => (k === "build" ? () => ({}) : noop) });

  function colNum(letters) { return letters.split("").reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0); }

  function Sheet(name) {
    const data = [];               // array of row arrays
    let maxRows = 1000, maxCols = 26, filter = null;
    const cell = (r, c) => (data[r - 1] && data[r - 1][c - 1] !== undefined ? data[r - 1][c - 1] : "");
    const put = (r, c, v) => {
      while (data.length < r) data.push([]);
      if (typeof v === "string" && v.startsWith("'")) v = v.slice(1);   // text marker, like Sheets
      else if (typeof v === "string" && v.startsWith("=")) v = { formula: v };
      data[r - 1][c - 1] = v;
    };
    const lastRow = () => { for (let i = data.length; i > 0; i--) if ((data[i - 1] || []).some((v) => v !== "" && v !== undefined)) return i; return 0; };
    const lastCol = () => data.reduce((m, row) => { for (let i = row.length; i > 0; i--) if (row[i - 1] !== "" && row[i - 1] !== undefined) return Math.max(m, i); return m; }, 0);
    function range(r, c, nr = 1, nc = 1) {
      const rg = new Proxy({
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => { const v = cell(r + i, c + j); return v && v.formula ? v.formula : v; })),
        getValue: () => { const v = cell(r, c); return v && v.formula ? v.formula : v; },
        setValues: (vals) => { vals.forEach((row, i) => row.forEach((v, j) => put(r + i, c + j, v))); return rg; },
        setValue: (v) => { put(r, c, v); return rg; },
        setFormula: (f) => { put(r, c, f); return rg; },
        createFilter: () => { filter = {}; return filter; }
      }, { get: (t, k) => (k in t ? t[k] : () => rg) });
      return rg;
    }
    const sh = new Proxy({
      getName: () => name,
      getRange: (a, b, c, d) => {
        if (typeof a === "string") {
          const m = a.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
          const c1 = colNum(m[1]), r1 = +m[2];
          return m[3] ? range(r1, c1, +m[4] - r1 + 1, colNum(m[3]) - c1 + 1) : range(r1, c1);
        }
        return range(a, b, c, d);
      },
      appendRow: (row) => { const r = lastRow() + 1; row.forEach((v, j) => put(r, j + 1, v)); },
      getLastRow: lastRow,
      getLastColumn: lastCol,
      getMaxRows: () => maxRows,
      getMaxColumns: () => maxCols,
      insertColumnsAfter: (a, n) => { maxCols += n; },
      getFilter: () => filter,
      clear: () => { data.length = 0; },
      _data: data
    }, { get: (t, k) => (k in t ? t[k] : () => sh) });
    return sh;
  }

  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = Sheet(n)),
    setSpreadsheetTimeZone: () => {},
    getUrl: () => "https://docs.google.com/spreadsheets/d/TEST",
    _sheets: sheets
  };
  const cache = {};
  const ctx = {
    console: { log() {}, error() {} },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ss,
      flush: () => {},
      newDataValidation: () => chain,
      newConditionalFormatRule: () => chain,
      BorderStyle: { SOLID: 1 },
      getUi: () => ({ alert: (m) => { ctx._alert = m; }, createMenu: () => chain })
    },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (s) => ({ setMimeType: () => ({ body: JSON.parse(s) }) })
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; } }) },
    Utilities: {
      formatDate: (d, tz, f) => (f === "MMdd" ? "1014" : f === "yyyyMMddHH" ? "2026101416" : f === "yyyy-MM-dd" ? (ctx._today || "2026-10-14") : d.toISOString()),
      getUuid: () => Math.random().toString(16).slice(2) + "abcdef12345"
    },
    MailApp: { sendEmail: (m) => mails.push(m) },
    Session: { getActiveUser: () => ({ getEmail: () => "owner@example.com" }) }
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, "../apps-script/Code.gs"), "utf8"), ctx);
  ctx._cache = cache;
  return { ctx, ss, mails, cache };
}

module.exports = { makeEnv };
