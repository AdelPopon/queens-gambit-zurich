/*
 * Local preview: serves the website and a stand-in for the Kids Chess Apps
 * Script web app (the real Code.gs running on in-memory sheets; emails are
 * only printed, never sent).
 *
 *   node registration/kids-chess/test/serve.js [port]
 *   → website  http://localhost:8080/kids/zollikon/
 *   → backend  http://localhost:8080/__kids-backend   (data/config.js is
 *     served with kidsChess.endpoint pointing here; the file is not changed)
 *   GET /__kids-state shows the stored rows and the emails "sent".
 */
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { makeEnv } = require("./mock-apps-script");

const ROOT = path.resolve(__dirname, "../../..");
const PORT = +(process.argv[2] || 8080);
const env = makeEnv();
env.ctx.setup();
if (process.env.KIDS_CAPACITY) {          // e.g. KIDS_CAPACITY=2 to try "full"
  env.ss._sheets.Settings._data.forEach((r) => { if (/^2026-/.test(r[0])) r[2] = +process.env.KIDS_CAPACITY; });
}
if (process.env.KIDS_PRICES) {            // e.g. KIDS_PRICES=40,40,60 (shown only for local preview)
  const p = process.env.KIDS_PRICES.split(",").map(Number);
  let i = 0;
  env.ss._sheets.Settings._data.forEach((r) => { if (/^2026-/.test(r[0])) r[3] = p[i++]; });
  env.ss._sheets.Settings._data.forEach((r) => { if (r[0] === "Publish prices") r[1] = "Yes"; });
}
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ico": "image/x-icon", ".json": "application/json", ".xml": "application/xml" };

http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const json = (o) => { res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); res.end(JSON.stringify(o, null, 1)); };
  if (url.pathname === "/__kids-backend") {
    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => setTimeout(() => json(env.ctx.doPost({ postData: { contents: body } }).body), 400));
      return;
    }
    return json(env.ctx.doGet({ parameter: Object.fromEntries(url.searchParams) }).body);
  }
  if (url.pathname === "/__kids-state") {
    const sh = env.ss._sheets.Registrations._data;
    return json({ rows: sh.slice(1).map((r) => Object.fromEntries(sh[0].map((h, i) => [h, r[i]]))),
      emails: env.mails.map((m) => ({ to: m.to, subject: m.subject, body: m.body })) });
  }
  if (url.pathname === "/__kids-email.html") {
    const m = env.mails.filter((x) => x.htmlBody).slice(-1)[0];
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(m ? m.htmlBody : "no email yet");
  }
  let file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end("not found"); }
  let data = fs.readFileSync(file);
  if (url.pathname === "/data/config.js") {
    data = data.toString().replace(/kidsChess: \{\n    endpoint: null/, `kidsChess: {\n    endpoint: "http://localhost:${PORT}/__kids-backend"`);
  }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
  res.end(data);
}).listen(PORT, () => console.log(`Preview: http://localhost:${PORT}/kids/zollikon/  (state: /__kids-state)`));
