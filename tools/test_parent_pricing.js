// QGZ Kids Parent Price Calculator: node tools/test_parent_pricing.js
"use strict";
const P = require("../js/kids-parents.js");
let fails = 0, checks = 0;
function eq(label, got, want) {
  checks++;
  if (got !== want) { fails++; console.log(`FAIL ${label}: got ${got}, expected ${want}`); }
}
// lessons, children, full year, payable (centimes), exact
const cases = [
  [12, 1, false, 30000, 300],
  [37, 1, true, 83250, 832.5],
  [37, 2, true, 162340, 1623.375],   // 832.50 + 790.875
  [12, 2, false, 58500, 585],        // 300.00 + 285.00
];
for (const [w, k, y, total, exact] of cases) {
  const r = P.calculate(w, k, y);
  eq(`${k} child(ren) ${w} lessons ${y ? "year" : "period"} payable`, r.total, total);
  eq(`${k} child(ren) ${w} lessons exact`, r.exactTotal, exact);
}
// prices per lesson: 25.00 / 22.50 / 23.75 / 21.375 (shown 21.38)
eq("1st period", P.calculate(1, 2, false).children[0].perLesson, 2500);
eq("2nd period", P.calculate(1, 2, false).children[1].perLesson, 2375);
eq("1st year", P.calculate(1, 2, true).children[0].perLesson, 2250);
eq("2nd year", P.calculate(1, 2, true).children[1].perLesson, 2138);
// savings and annual incentive
const r = P.calculate(12, 2, false);
eq("full price", r.fullPrice, 60000);
eq("saved", r.saved, 1500);
eq("yearly alternative", r.yearlyTotal, 52650);   // 270 + 256.50
eq("no saving 1 child period", P.calculate(12, 1, false).saved, 0);
eq("chf", P.chf(162340), "CHF 1’623.40");
console.log(`${checks - fails}/${checks} checks passed`);
process.exit(fails ? 1 : 0);
